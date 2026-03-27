import { table, text, integer, primaryId, currentTimestampText } from './schema-core.js';

export const account = table('account', {
	accountId: primaryId('account_id'),
	email: text('email').notNull(),
	name: text('name').notNull().default(''),
	status: integer('status').default(0).notNull(),
	latestEmailTime: text('latest_email_time'),
	createTime: currentTimestampText('create_time'),
	userId: integer('user_id').notNull(),
	allReceive: integer('all_receive').default(0).notNull(),
	sort: integer('sort').default(0).notNull(),
	isDel: integer('is_del').default(0).notNull(),
});
export default account
