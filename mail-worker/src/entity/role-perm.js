import { table, integer, primaryId } from './schema-core.js';

export const rolePerm = table('role_perm', {
	id: primaryId('id'),
	roleId: integer('role_id'),
	permId: integer('perm_id')
});
export default rolePerm
