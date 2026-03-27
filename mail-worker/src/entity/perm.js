import { table, text, integer, primaryId, real } from './schema-core.js';

export const perm = table('perm', {
	permId: primaryId('perm_id'),
	name: text('name').notNull(),
	permKey: text('perm_key'),
	pid: integer('pid').notNull().default(0),
	type: integer('type').notNull().default(2),
	sort: real('sort')
});
export default perm
