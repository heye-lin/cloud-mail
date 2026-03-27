import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import { isPgDialect } from '../platform/db-dialect.js';

const PG_COMPAT_CACHE = new WeakMap();

function shouldWrap(value) {
	return !!value
		&& (typeof value === 'object' || typeof value === 'function')
		&& !Array.isArray(value)
		&& !(value instanceof Date)
		&& !(value instanceof ArrayBuffer)
		&& !ArrayBuffer.isView(value);
}

async function executeTarget(target) {
	if (typeof target.execute === 'function') {
		return target.execute();
	}

	return target;
}

function wrapPgCompat(target) {
	if (!shouldWrap(target)) {
		return target;
	}

	const cached = PG_COMPAT_CACHE.get(target);
	if (cached) {
		return cached;
	}

	const proxy = new Proxy(target, {
		get(currentTarget, prop, receiver) {
			if (prop === 'get' && !(prop in currentTarget)) {
				return async () => {
					const result = await executeTarget(currentTarget);
					return Array.isArray(result) ? (result[0] ?? undefined) : result;
				};
			}

			if ((prop === 'all' || prop === 'run') && !(prop in currentTarget)) {
				return async () => executeTarget(currentTarget);
			}

			const value = Reflect.get(currentTarget, prop, receiver);

			if (typeof value === 'function') {
				if (prop === 'then' || prop === 'catch' || prop === 'finally' || prop === 'execute') {
					return value.bind(currentTarget);
				}

				return (...args) => wrapPgCompat(value.apply(currentTarget, args));
			}

			return wrapPgCompat(value);
		}
	});

	PG_COMPAT_CACHE.set(target, proxy);
	return proxy;
}

export default function orm(c) {
	if (isPgDialect(c)) {
		return wrapPgCompat(drizzlePg(c.env.pg, { logger: c.env.orm_log }));
	}

	return drizzleD1(c.env.db, { logger: c.env.orm_log });
}
