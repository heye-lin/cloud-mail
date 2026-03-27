import inboundEmailService from '../service/inbound-email-service.js';

export async function email(message, env, ctx) {

	try {
		const receiveResult = await inboundEmailService.receive(
			{ env },
			{
				raw: message.raw,
				to: message.to,
				from: message.from
			}
		);

		if (!receiveResult.accepted) {
			message.setReject(receiveResult.rejectReason);
			return;
		}

		if (receiveResult.forwardTargets.length > 0) {
			await Promise.all(receiveResult.forwardTargets.map(async (email) => {
				try {
					await message.forward(email);
				} catch (e) {
					console.error(`转发邮箱 ${email} 失败：`, e);
				}
			}));
		}

	} catch (e) {
		console.error('邮件接收异常: ', e);
		throw e
	}
}
