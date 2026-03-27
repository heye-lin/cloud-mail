import orm from '../entity/orm.js';
import email from '../entity/email.js';
import settingService from './setting-service.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
dayjs.extend(utc);
dayjs.extend(timezone);
import { eq } from 'drizzle-orm';
import jwtUtils from '../utils/jwt-utils.js';
import emailMsgTemplate from '../template/email-msg.js';
import emailTextTemplate from '../template/email-text.js';
import emailHtmlTemplate from '../template/email-html.js';
import verifyUtils from '../utils/verify-utils.js';
import domainUtils from "../utils/domain-uitls.js";

const telegramService = {

	async getEmailContent(c, params) {

		const { token } = params

		const result = await jwtUtils.verifyToken(c, token);

		if (!result) {
			return emailTextTemplate('Access denied')
		}

		const emailRow = await orm(c).select().from(email).where(eq(email.emailId, result.emailId)).get();

		if (emailRow) {

			if (emailRow.content) {
				const { r2Domain } = await settingService.query(c);
				return emailHtmlTemplate(emailRow.content || '', r2Domain)
			} else {
				return emailTextTemplate(emailRow.text || '')
			}

		} else {
			return emailTextTemplate('The email does not exist')
		}

	},

	async sendEmailToBot(c, email) {

		const { tgBotToken, tgChatId, customDomain, tgMsgTo, tgMsgFrom, tgMsgText } = await settingService.query(c);

		const tgChatIds = tgChatId.split(',');

		const jwtToken = await jwtUtils.generateToken(c, { emailId: email.emailId })
		const webAppUrl = customDomain ? `${domainUtils.toOssDomain(customDomain)}/api/telegram/getEmail/${jwtToken}` : null

		await Promise.all(tgChatIds.map(async chatId => {
			try {
				const body = {
					chat_id: chatId,
					parse_mode: 'HTML',
					text: emailMsgTemplate(email, tgMsgTo, tgMsgFrom, tgMsgText)
				};

				if (webAppUrl) {
					body.reply_markup = {
						inline_keyboard: [
							[
								{
									text: '查看',
									web_app: { url: webAppUrl }
								}
							]
						]
					};
				}

				const res = await fetch(`https://api.telegram.org/bot${tgBotToken}/sendMessage`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(body)
				});
				if (!res.ok) {
					console.error(`转发 Telegram 失败 status: ${res.status} response: ${await res.text()}`);
				}
			} catch (e) {
				console.error(`转发 Telegram 失败:`, e.message);
			}
		}));

	}

}

export default telegramService
