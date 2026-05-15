import { sql } from 'drizzle-orm';

const LIKE_ESCAPE = '\\';
const DEFAULT_LIKE_TERM_MAX_LENGTH = 256;
const CONTENT_LIKE_TERM_MAX_LENGTH = 1024;

function normalizeLikeTerm(value, maxLength = DEFAULT_LIKE_TERM_MAX_LENGTH) {
	if (value === null || value === undefined) {
		return '';
	}

	return String(value).trim().slice(0, maxLength);
}

function escapeLikeTerm(value, maxLength = DEFAULT_LIKE_TERM_MAX_LENGTH) {
	return normalizeLikeTerm(value, maxLength)
		.replace(/\\/g, '\\\\')
		.replace(/%/g, '\\%')
		.replace(/_/g, '\\_');
}

function buildLikePattern(value, options = {}) {
	const {
		left = true,
		right = true,
		maxLength = DEFAULT_LIKE_TERM_MAX_LENGTH
	} = options;
	const term = escapeLikeTerm(value, maxLength);

	if (!term) {
		return '';
	}

	return `${left ? '%' : ''}${term}${right ? '%' : ''}`;
}

function buildLegacyLikePattern(value, options = {}) {
	const {
		maxLength = DEFAULT_LIKE_TERM_MAX_LENGTH
	} = options;
	const raw = normalizeLikeTerm(value, Number.MAX_SAFE_INTEGER);

	if (!raw) {
		return '';
	}

	const left = raw.startsWith('%');
	const right = raw.endsWith('%');
	const term = raw.replace(/^%+/, '').replace(/%+$/, '').slice(0, maxLength);

	return buildLikePattern(term, { left, right, maxLength });
}

function likeIgnoreCase(column, pattern) {
	return sql`${column} COLLATE NOCASE LIKE ${pattern} ESCAPE ${LIKE_ESCAPE}`;
}

export {
	CONTENT_LIKE_TERM_MAX_LENGTH,
	DEFAULT_LIKE_TERM_MAX_LENGTH,
	buildLegacyLikePattern,
	buildLikePattern,
	escapeLikeTerm,
	likeIgnoreCase
};
