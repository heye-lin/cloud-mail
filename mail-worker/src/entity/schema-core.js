import { sql } from 'drizzle-orm';
import * as sqlite from 'drizzle-orm/sqlite-core';
import * as pg from 'drizzle-orm/pg-core';
import { getStaticDbDialect } from '../platform/db-dialect.js';

const DIALECT = getStaticDbDialect();
const usePg = DIALECT === 'pg';

export const table = usePg ? pg.pgTable : sqlite.sqliteTable;
export const text = usePg ? pg.text : sqlite.text;
export const integer = usePg ? pg.integer : sqlite.integer;
export const real = usePg ? pg.doublePrecision : sqlite.real;

export function primaryId(name) {
	return usePg
		? pg.serial(name).primaryKey()
		: sqlite.integer(name).primaryKey({ autoIncrement: true });
}

export function currentTimestampText(name, notNull = false) {
	let column = text(name).default(usePg ? sql`CURRENT_TIMESTAMP::text` : sql`CURRENT_TIMESTAMP`);

	if (notNull) {
		column = column.notNull();
	}

	return column;
}
