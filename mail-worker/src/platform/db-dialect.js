const PG_ALIASES = new Set(['pg', 'postgres', 'postgresql']);

function normalizeDialect(value) {
	if (!value) {
		return null;
	}

	const dialect = String(value).trim().toLowerCase();
	if (PG_ALIASES.has(dialect)) {
		return 'pg';
	}

	return 'sqlite';
}

export function getStaticDbDialect() {
	const processEnv = globalThis.process?.env || {};
	return normalizeDialect(processEnv.MAIL_DB_DIALECT || processEnv.DB_DIALECT) || 'sqlite';
}

export function getDbDialect(c) {
	return normalizeDialect(
		c?.env?.db_dialect ||
		c?.env?.dbDialect ||
		globalThis.process?.env?.MAIL_DB_DIALECT ||
		globalThis.process?.env?.DB_DIALECT
	) || 'sqlite';
}

export function isPgDialect(c) {
	return getDbDialect(c) === 'pg';
}
