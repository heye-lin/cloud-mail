import { emailConst } from '../const/entity-const.js';
import orm from '../entity/orm.js';
import email from '../entity/email.js';
import user from '../entity/user.js';
import account from '../entity/account.js';
import { and, count, eq, ne } from 'drizzle-orm';
import dayjs from 'dayjs';

function normalizeTotal(row) {
	return Number(row?.total || 0);
}

function groupByDate(rows, diffHours) {
	const start = dayjs().add(diffHours, 'hour').subtract(15, 'day').startOf('day');
	const end = dayjs().add(diffHours, 'hour').subtract(1, 'day').endOf('day');
	const totals = new Map();

	for (const row of rows) {
		if (!row?.createTime) {
			continue;
		}

		const localTime = dayjs(row.createTime).add(diffHours, 'hour');

		if (!localTime.isValid()) {
			continue;
		}

		if (localTime.isBefore(start) || localTime.isAfter(end)) {
			continue;
		}

		const key = localTime.format('YYYY-MM-DD');
		totals.set(key, (totals.get(key) || 0) + 1);
	}

	return [...totals.entries()]
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([date, total]) => ({ date, total }));
}

const analysisDao = {
	async numberCount(c) {
		const [
			receiveTotal,
			sendTotal,
			delReceiveTotal,
			delSendTotal,
			normalReceiveTotal,
			normalSendTotal,
			userTotal,
			normalUserTotal,
			delUserTotal,
			accountTotal,
			normalAccountTotal,
			delAccountTotal
		] = await Promise.all([
			orm(c).select({ total: count() }).from(email).where(and(eq(email.type, 0), ne(email.status, emailConst.status.SAVING))).get(),
			orm(c).select({ total: count() }).from(email).where(and(eq(email.type, 1), ne(email.status, emailConst.status.SAVING))).get(),
			orm(c).select({ total: count() }).from(email).where(and(eq(email.type, 0), eq(email.isDel, 1), ne(email.status, emailConst.status.SAVING))).get(),
			orm(c).select({ total: count() }).from(email).where(and(eq(email.type, 1), eq(email.isDel, 1), ne(email.status, emailConst.status.SAVING))).get(),
			orm(c).select({ total: count() }).from(email).where(and(eq(email.type, 0), eq(email.isDel, 0), ne(email.status, emailConst.status.SAVING))).get(),
			orm(c).select({ total: count() }).from(email).where(and(eq(email.type, 1), eq(email.isDel, 0), ne(email.status, emailConst.status.SAVING))).get(),
			orm(c).select({ total: count() }).from(user).get(),
			orm(c).select({ total: count() }).from(user).where(eq(user.isDel, 0)).get(),
			orm(c).select({ total: count() }).from(user).where(eq(user.isDel, 1)).get(),
			orm(c).select({ total: count() }).from(account).get(),
			orm(c).select({ total: count() }).from(account).where(eq(account.isDel, 0)).get(),
			orm(c).select({ total: count() }).from(account).where(eq(account.isDel, 1)).get()
		]);

		return {
			receiveTotal: normalizeTotal(receiveTotal),
			sendTotal: normalizeTotal(sendTotal),
			delReceiveTotal: normalizeTotal(delReceiveTotal),
			delSendTotal: normalizeTotal(delSendTotal),
			normalReceiveTotal: normalizeTotal(normalReceiveTotal),
			normalSendTotal: normalizeTotal(normalSendTotal),
			userTotal: normalizeTotal(userTotal),
			normalUserTotal: normalizeTotal(normalUserTotal),
			delUserTotal: normalizeTotal(delUserTotal),
			accountTotal: normalizeTotal(accountTotal),
			normalAccountTotal: normalizeTotal(normalAccountTotal),
			delAccountTotal: normalizeTotal(delAccountTotal)
		};
	},

	async userDayCount(c, diffHours) {
		const rows = await orm(c).select({ createTime: user.createTime }).from(user).all();
		return groupByDate(rows, diffHours);
	},

	async receiveDayCount(c, diffHours) {
		const rows = await orm(c).select({ createTime: email.createTime }).from(email).where(eq(email.type, 0)).all();
		return groupByDate(rows, diffHours);
	},

	async sendDayCount(c, diffHours) {
		const rows = await orm(c).select({ createTime: email.createTime }).from(email).where(eq(email.type, 1)).all();
		return groupByDate(rows, diffHours);
	}

};

export default analysisDao;
