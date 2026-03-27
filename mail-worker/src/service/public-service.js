import BizError from '../error/biz-error.js';
import orm from '../entity/orm.js';
import { v4 as uuidv4 } from 'uuid';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import saltHashUtils from '../utils/crypto-utils.js';
import cryptoUtils from '../utils/crypto-utils.js';
import emailUtils from '../utils/email-utils.js';
import roleService from './role-service.js';
import verifyUtils from '../utils/verify-utils.js';
import { t } from '../i18n/i18n.js';
import reqUtils from '../utils/req-utils.js';
import dayjs from 'dayjs';
import { isDel, roleConst } from '../const/entity-const.js';
import email from '../entity/email.js';
import userService from './user-service.js';
import KvConst from '../const/kv-const.js';
import user from '../entity/user.js';
import account from '../entity/account.js';
import { ciLike } from '../utils/query-utils.js';

function isUniqueViolation(error) {
	const message = error?.message || '';
	return message.includes('SQLITE_CONSTRAINT') || message.includes('duplicate key value') || message.includes('UNIQUE constraint failed');
}

const publicService = {

	async emailList(c, params) {

		let { toEmail, content, subject, sendName, sendEmail, timeSort, num, size, type , isDel } = params

		const query = orm(c).select({
				emailId: email.emailId,
				sendEmail: email.sendEmail,
				sendName: email.name,
				subject: email.subject,
				toEmail: email.toEmail,
				toName: email.toName,
				type: email.type,
				createTime: email.createTime,
				content: email.content,
				text: email.text,
				isDel: email.isDel,
		}).from(email)

		if (!size) {
			size = 20
		}

		if (!num) {
			num = 1
		}

		size = Number(size);
		num = Number(num);

		num = (num - 1) * size;

		let conditions = []

		if (toEmail) {
			conditions.push(ciLike(c, email.toEmail, toEmail))
		}

		if (sendEmail) {
			conditions.push(ciLike(c, email.sendEmail, sendEmail))
		}

		if (sendName) {
			conditions.push(ciLike(c, email.name, sendName))
		}

		if (subject) {
			conditions.push(ciLike(c, email.subject, subject))
		}

		if (content) {
			conditions.push(ciLike(c, email.content, content))
		}

		if (type || type === 0) {
			conditions.push(eq(email.type, type))
		}

		if (isDel || isDel === 0) {
			conditions.push(eq(email.isDel, isDel))
		}

		if (conditions.length === 1) {
			query.where(...conditions)
		} else if (conditions.length > 1) {
			query.where(and(...conditions))
		}

		if (timeSort === 'asc') {
			query.orderBy(asc(email.emailId));
		} else {
			query.orderBy(desc(email.emailId));
		}

		return query.limit(size).offset(num);

	},

	async addUser(c, params) {
		const { list } = params;

		if (list.length === 0) return;

		for (const emailRow of list) {
			if (!verifyUtils.isEmail(emailRow.email)) {
				throw new BizError(t('notEmail'));
			}

			if (!c.env.domain.includes(emailUtils.getDomain(emailRow.email))) {
				throw new BizError(t('notEmailDomain'));
			}

			const { salt, hash } = await saltHashUtils.hashPassword(
				emailRow.password || cryptoUtils.genRandomPwd()
			);

			emailRow.salt = salt;
			emailRow.hash = hash;
		}


		const activeIp = reqUtils.getIp(c);
		const { os, browser, device } = reqUtils.getUserAgent(c);
		const activeTime = dayjs().format('YYYY-MM-DD HH:mm:ss');

		const roleList = await roleService.roleSelectUse(c);
		const defRole = roleList.find(roleRow => roleRow.isDefault === roleConst.isDefault.OPEN);

		for (const emailRow of list) {
			let { email, hash, salt, roleName } = emailRow;
			let type = defRole.roleId;

			if (roleName) {
				const roleRow = roleList.find(role => role.name === roleName);
				type = roleRow ? roleRow.roleId : type;
			}

			try {
				const userRow = await orm(c).insert(user).values({
					email,
					password: hash,
					salt,
					type,
					os,
					browser,
					activeIp,
					createIp: activeIp,
					device,
					activeTime,
					createTime: activeTime
				}).returning().get();

				await orm(c).insert(account).values({
					email,
					name: emailUtils.getName(email),
					userId: userRow.userId
				}).run();
			} catch (error) {
				if (isUniqueViolation(error)) {
					throw new BizError(t('emailExistDatabase'));
				}

				throw error;
			}
		}

	},

	async genToken(c, params) {

		await this.verifyUser(c, params)

		const uuid = uuidv4();

		await c.env.kv.put(KvConst.PUBLIC_KEY, uuid);

		return {token: uuid}
	},

	async verifyUser(c, params) {

		const { email, password } = params

		const userRow = await userService.selectByEmailIncludeDel(c, email);

		if (email !== c.env.admin) {
			throw new BizError(t('notAdmin'));
		}

		if (!userRow || userRow.isDel === isDel.DELETE) {
			throw new BizError(t('notExistUser'));
		}

		if (!await cryptoUtils.verifyPassword(password, userRow.salt, userRow.password)) {
			throw new BizError(t('IncorrectPwd'));
		}
	}

}

export default publicService
