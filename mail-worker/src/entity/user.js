import { table, text, integer, primaryId, currentTimestampText } from './schema-core.js';

const user = table('user', {
	userId: primaryId('user_id'),
	email: text('email').notNull(),
	type: integer('type').default(1).notNull(),
	password: text('password').notNull(),
	salt: text('salt').notNull(),
	status: integer('status').default(0).notNull(),
	createTime: currentTimestampText('create_time'),
	activeTime: text('active_time'),
	createIp: text('create_ip'),
	activeIp: text('active_ip'),
	os: text('os'),
	browser: text('browser'),
	device: text('device'),
	sort: integer('sort').default(0),
	sendCount: integer('send_count').default(0),
	regKeyId: integer('reg_key_id').default(0).notNull(),
	isDel: integer('is_del').default(0).notNull()
});
export default user
