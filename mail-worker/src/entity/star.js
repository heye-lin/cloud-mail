import { table, integer, primaryId, currentTimestampText } from './schema-core.js';

export const star = table('star', {
	starId: primaryId('star_id'),
	userId: integer('user_id').notNull(),
	emailId: integer('email_id').notNull(),
	createTime: currentTimestampText('create_time', true),
});
