import { table, text, integer, primaryId, currentTimestampText } from './schema-core.js';

export const regKey = table('reg_key', {
	regKeyId: primaryId('rege_key_id'),
	code: text('code').notNull().default(''),
	count: integer('count').notNull().default(0),
	roleId: integer('role_id').notNull().default(0),
	userId: integer('user_id').notNull().default(0),
	expireTime: text('expire_time'),
	createTime: currentTimestampText('create_time', true)
});
export default regKey
