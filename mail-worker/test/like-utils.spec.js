import { describe, expect, it } from 'vitest';
import {
	CONTENT_LIKE_TERM_MAX_LENGTH,
	DEFAULT_LIKE_TERM_MAX_LENGTH,
	buildLegacyLikePattern,
	buildLikePattern,
	escapeLikeTerm
} from '../src/utils/like-utils';

describe('like-utils', () => {
	it('escapes SQLite LIKE wildcards and the escape character', () => {
		expect(escapeLikeTerm('100%_\\done')).toBe('100\\%\\_\\\\done');
		expect(buildLikePattern('100%_\\done')).toBe('%100\\%\\_\\\\done%');
	});

	it('supports prefix and exact pattern shapes without exposing raw wildcards', () => {
		expect(buildLikePattern('abc', { left: false, right: true })).toBe('abc%');
		expect(buildLikePattern('a%c', { left: false, right: false })).toBe('a\\%c');
	});

	it('keeps simple legacy edge wildcards while escaping inner wildcards', () => {
		expect(buildLegacyLikePattern('%abc_def%')).toBe('%abc\\_def%');
		expect(buildLegacyLikePattern('abc%def')).toBe('abc\\%def');
	});

	it('caps search terms before building patterns', () => {
		const longTerm = 'x'.repeat(DEFAULT_LIKE_TERM_MAX_LENGTH + 10);
		const longContent = 'x'.repeat(CONTENT_LIKE_TERM_MAX_LENGTH + 10);

		expect(buildLikePattern(longTerm)).toBe(`%${'x'.repeat(DEFAULT_LIKE_TERM_MAX_LENGTH)}%`);
		expect(buildLegacyLikePattern(`%${longContent}%`, { maxLength: CONTENT_LIKE_TERM_MAX_LENGTH }))
			.toBe(`%${'x'.repeat(CONTENT_LIKE_TERM_MAX_LENGTH)}%`);
	});
});
