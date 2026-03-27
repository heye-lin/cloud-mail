import { table, text, integer, primaryId, currentTimestampText } from './schema-core.js';

export const role = table('role', {
	roleId: primaryId('role_id'),
	name: text('name').notNull(),
	key: text('key'),
	description: text('description'),
	banEmail: text('ban_email').notNull().default(''),
	banEmailType: integer('ban_email_type').notNull().default(0),
	availDomain: text('avail_domain').default(''),
	sort: integer('sort'),
	isDefault: integer('is_default').default(0),
	createTime: currentTimestampText('create_time', true),
	userId: integer('user_id'),
	sendCount: integer('send_count'),
	sendType: text('send_type').default('count'),
	accountCount: integer('account_count')
});
export default role
