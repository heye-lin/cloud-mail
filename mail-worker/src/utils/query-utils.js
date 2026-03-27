import { ilike, sql } from 'drizzle-orm';
import { isPgDialect } from '../platform/db-dialect.js';

export function ciEquals(c, column, value) {
	if (isPgDialect(c)) {
		return sql`lower(${column}) = lower(${value})`;
	}

	return sql`${column} COLLATE NOCASE = ${value}`;
}

export function ciLike(c, column, pattern) {
	if (isPgDialect(c)) {
		return ilike(column, pattern);
	}

	return sql`${column} COLLATE NOCASE LIKE ${pattern}`;
}

export function ciContains(c, column, value) {
	return ciLike(c, column, `%${value}%`);
}
