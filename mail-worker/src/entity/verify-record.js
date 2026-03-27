import { table, text, integer, primaryId, currentTimestampText } from './schema-core.js';

export const email = table('verify_record', {
	vrId: primaryId('vr_id'),
	ip: text('ip').notNull().default(''),
	count: integer('count').notNull().default(1),
	type: integer('type').notNull().default(0),
	updateTime: currentTimestampText('update_time', true),
});
export default email
