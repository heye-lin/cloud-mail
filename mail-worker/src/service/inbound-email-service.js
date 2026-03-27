import PostalMime from 'postal-mime';
import emailService from './email-service.js';
import accountService from './account-service.js';
import settingService from './setting-service.js';
import attService from './att-service.js';
import constant from '../const/constant.js';
import fileUtils from '../utils/file-utils.js';
import { emailConst, isDel, settingConst } from '../const/entity-const.js';
import emailUtils from '../utils/email-utils.js';
import roleService from './role-service.js';
import userService from './user-service.js';
import telegramService from './telegram-service.js';

function normalizeEmailAddress(value) {
	return value ? String(value).trim().toLowerCase() : '';
}

function normalizeAddressEntry(entry) {
	if (!entry) {
		return null;
	}

	if (typeof entry === 'string') {
		const address = normalizeEmailAddress(entry);

		if (!address) {
			return null;
		}

		return {
			address,
			name: emailUtils.getName(address)
		};
	}

	const address = normalizeEmailAddress(entry.address || entry.email || entry.Email);

	if (!address) {
		return null;
	}

	return {
		address,
		name: entry.name || entry.Name || emailUtils.getName(address)
	};
}

function normalizeAddressList(list) {
	if (!Array.isArray(list)) {
		return [];
	}

	return list
		.map(normalizeAddressEntry)
		.filter(Boolean);
}

function splitEmails(value) {
	return String(value || '')
		.split(',')
		.map((item) => normalizeEmailAddress(item))
		.filter(Boolean);
}

function decodeBytes(bytes) {
	return new TextDecoder().decode(bytes);
}

async function readRawEmail(raw) {
	if (typeof raw === 'string') {
		return raw;
	}

	if (raw instanceof ArrayBuffer) {
		return decodeBytes(new Uint8Array(raw));
	}

	if (ArrayBuffer.isView(raw)) {
		return decodeBytes(new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength));
	}

	if (typeof raw?.arrayBuffer === 'function') {
		return readRawEmail(await raw.arrayBuffer());
	}

	if (typeof raw?.getReader === 'function') {
		const reader = raw.getReader();
		const chunks = [];
		let totalLength = 0;

		while (true) {
			const { done, value } = await reader.read();
			if (done) {
				break;
			}

			const chunk = value instanceof Uint8Array ? value : new Uint8Array(value);
			chunks.push(chunk);
			totalLength += chunk.byteLength;
		}

		const merged = new Uint8Array(totalLength);
		let offset = 0;

		for (const chunk of chunks) {
			merged.set(chunk, offset);
			offset += chunk.byteLength;
		}

		return decodeBytes(merged);
	}

	throw new Error('Unsupported raw email payload');
}

function acceptedResult(extra = {}) {
	return {
		accepted: true,
		stored: false,
		forwardTargets: [],
		rejectReason: null,
		...extra
	};
}

function rejectedResult(reason, extra = {}) {
	return {
		accepted: false,
		stored: false,
		forwardTargets: [],
		rejectReason: reason,
		...extra
	};
}

function getHeaderValue(headers, name) {
	if (!Array.isArray(headers)) {
		return '';
	}

	const target = String(name || '').toLowerCase();
	const row = headers.find((item) => String(item?.key || item?.name || item?.Name || '').toLowerCase() === target);
	return row?.value || row?.Value || '';
}

function decodeBase64ToBytes(value) {
	if (!value) {
		return null;
	}

	const binary = atob(String(value));
	const bytes = new Uint8Array(binary.length);

	for (let index = 0; index < binary.length; index++) {
		bytes[index] = binary.charCodeAt(index);
	}

	return bytes;
}

const inboundEmailService = {
	async receiveParsed(c, payload) {
		const recipient = normalizeEmailAddress(payload?.to);
		const envelopeFrom = normalizeEmailAddress(payload?.from);
		const parsedEmail = payload?.parsedEmail || {};
		const {
			receive,
			tgChatId,
			tgBotStatus,
			forwardStatus,
			forwardEmail,
			ruleEmail,
			ruleType,
			r2Domain,
			noRecipient
		} = await settingService.query(c);

		if (receive === settingConst.receive.CLOSE) {
			return rejectedResult('Service suspended');
		}

		parsedEmail.from = normalizeAddressEntry(parsedEmail.from);
		parsedEmail.to = normalizeAddressList(parsedEmail.to);
		parsedEmail.cc = normalizeAddressList(parsedEmail.cc);
		parsedEmail.bcc = normalizeAddressList(parsedEmail.bcc);

		const targetEmail = recipient || normalizeEmailAddress(parsedEmail?.to?.[0]?.address);

		if (!targetEmail) {
			return rejectedResult('Recipient not found');
		}

		const senderEmail = normalizeEmailAddress(parsedEmail?.from?.address) || envelopeFrom;

		if (!senderEmail) {
			return rejectedResult('Sender not found');
		}

		const account = await accountService.selectByEmailIncludeDel(c, targetEmail);

		if (!account && noRecipient === settingConst.noRecipient.CLOSE) {
			return rejectedResult('Recipient not found');
		}

		let userRow = {};

		if (account) {
			userRow = await userService.selectByIdIncludeDel(c, account.userId);
		}

		if (account && userRow.email !== c.env.admin) {
			const roleRow = await roleService.selectByUserId(c, account.userId);

			if (!roleService.hasAvailDomainPerm(roleRow.availDomain, targetEmail)) {
				return rejectedResult('The recipient is not authorized to use this domain.');
			}

			if (roleService.isBanEmail(roleRow.banEmail, senderEmail)) {
				return rejectedResult('The recipient is disabled from receiving emails.');
			}
		}

		if (!parsedEmail.to) {
			parsedEmail.to = [{ address: targetEmail, name: emailUtils.getName(targetEmail) }];
		}

		const toName = parsedEmail.to.find((item) => normalizeEmailAddress(item.address) === targetEmail)?.name || '';

		const params = {
			toEmail: targetEmail,
			toName,
			sendEmail: senderEmail,
			name: parsedEmail?.from?.name || emailUtils.getName(senderEmail),
			subject: parsedEmail.subject,
			content: parsedEmail.html,
			text: parsedEmail.text,
			cc: parsedEmail.cc ? JSON.stringify(parsedEmail.cc) : '[]',
			bcc: parsedEmail.bcc ? JSON.stringify(parsedEmail.bcc) : '[]',
			recipient: JSON.stringify(parsedEmail.to),
			inReplyTo: parsedEmail.inReplyTo,
			relation: parsedEmail.references,
			messageId: parsedEmail.messageId,
			userId: account ? account.userId : 0,
			accountId: account ? account.accountId : 0,
			isDel: isDel.DELETE,
			status: emailConst.status.SAVING
		};

		const attachments = [];
		const cidAttachments = [];

		for (const item of parsedEmail.attachments || []) {
			const attachment = { ...item };

			if (!attachment.content) {
				continue;
			}

			attachment.key = constant.ATTACHMENT_PREFIX + await fileUtils.getBuffHash(attachment.content) + fileUtils.getExtFileName(item.filename);
			attachment.size = item.content.length ?? item.content.byteLength;
			attachments.push(attachment);

			if (attachment.contentId) {
				cidAttachments.push(attachment);
			}
		}

		let emailRow = await emailService.receive(c, params, cidAttachments, r2Domain);

		attachments.forEach((attachment) => {
			attachment.emailId = emailRow.emailId;
			attachment.userId = emailRow.userId;
			attachment.accountId = emailRow.accountId;
		});

		try {
			if (attachments.length > 0) {
				await attService.addAtt(c, attachments);
			}
		} catch (error) {
			console.error(error);
		}

		emailRow = await emailService.completeReceive(
			c,
			account ? emailConst.status.RECEIVE : emailConst.status.NOONE,
			emailRow.emailId
		);

		let forwardTargets = [];
		const ruleEmails = splitEmails(ruleEmail);

		if (ruleType !== settingConst.ruleType.RULE || ruleEmails.includes(targetEmail)) {
			if (tgBotStatus === settingConst.tgBotStatus.OPEN && tgChatId) {
				await telegramService.sendEmailToBot(c, emailRow);
			}

			if (forwardStatus === settingConst.forwardStatus.OPEN && forwardEmail) {
				forwardTargets = splitEmails(forwardEmail);
			}
		}

		return acceptedResult({
			stored: true,
			emailId: emailRow.emailId,
			accountId: emailRow.accountId,
			userId: emailRow.userId,
			status: emailRow.status,
			messageId: emailRow.messageId,
			forwardTargets
		});
	},

	async receive(c, payload) {
		const raw = await readRawEmail(payload?.raw);
		const parsedEmail = await PostalMime.parse(raw);

		return this.receiveParsed(c, {
			to: payload?.to,
			from: payload?.from,
			parsedEmail
		});
	},

	async receivePostmark(c, body) {
		const to = normalizeEmailAddress(body?.OriginalRecipient || body?.MailboxHash || body?.ToFull?.[0]?.Email || body?.To);
		const from = normalizeEmailAddress(body?.FromFull?.Email || body?.From);
		const attachments = Array.isArray(body?.Attachments) ? body.Attachments : [];
		const headers = Array.isArray(body?.Headers) ? body.Headers : [];

		const parsedEmail = {
			from: normalizeAddressEntry({
				address: from,
				name: body?.FromFull?.Name || body?.FromName || emailUtils.getName(from)
			}),
			to: normalizeAddressList(body?.ToFull?.length ? body.ToFull : (to ? [{ Email: to, Name: emailUtils.getName(to) }] : [])),
			cc: normalizeAddressList(body?.CcFull),
			bcc: normalizeAddressList(body?.BccFull),
			subject: body?.Subject || '',
			html: body?.HtmlBody || '',
			text: body?.TextBody || emailUtils.htmlToText(body?.HtmlBody || ''),
			messageId: body?.MessageID || body?.MessageId || '',
			inReplyTo: getHeaderValue(headers, 'In-Reply-To'),
			references: getHeaderValue(headers, 'References'),
			attachments: attachments.map((item) => ({
				filename: item?.Name || 'attachment',
				mimeType: item?.ContentType || 'application/octet-stream',
				content: decodeBase64ToBytes(item?.Content),
				contentId: item?.ContentID || item?.ContentId || null
			}))
		};

		return this.receiveParsed(c, {
			to,
			from,
			parsedEmail
		});
	}
};

export default inboundEmailService;
