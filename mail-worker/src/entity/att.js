import { table, integer, text, primaryId, currentTimestampText } from './schema-core.js';

export const att = table('attachments', {
	attId: primaryId('att_id'),
	userId: integer('user_id').notNull(),
	emailId: integer('email_id').notNull(),
	accountId: integer('account_id').notNull(),
	key: text('key').notNull(),
	filename: text('filename'),
	mimeType: text('mime_type'),
	size: integer('size'),
	status: integer('status').default(0).notNull(),
	type: integer('type').default(0).notNull(),
	disposition: text('disposition'),
	related: text('related'),
	contentId: text('content_id'),
	encoding: text('encoding'),
	createTime: currentTimestampText('create_time', true),
});
