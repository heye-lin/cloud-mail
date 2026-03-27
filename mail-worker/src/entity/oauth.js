import { table, integer, text, primaryId, currentTimestampText } from './schema-core.js';

export const oauth = table('oauth', {
	oauthId: primaryId('oauth_id'),
	oauthUserId: text('oauth_user_id'),
	username: text('username'),
	name: text('name'),
	avatar: text('avatar'),
	active: integer('active'),
	trustLevel: integer('trust_level'),
	silenced: integer('silenced'),
	createTime: currentTimestampText('create_time', true),
	platform: integer('platform').default(0).notNull(),
	userId: integer('user_id').default(0).notNull()
});
