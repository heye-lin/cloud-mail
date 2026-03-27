import Redis from 'ioredis';
import postgres from 'postgres';
import { createPgCompatDb } from './pg-db.js';
import { createRedisKv } from './redis-kv.js';

let redisClient;
let postgresClient;
let kvAdapter;
let dbAdapter;

function readVar(...keys) {
	for (const key of keys) {
		const value = globalThis.process?.env?.[key];
		if (value !== undefined && value !== '') {
			return value;
		}
	}

	return undefined;
}

function parseBool(value, fallback = false) {
	if (value === undefined) {
		return fallback;
	}

	if (typeof value === 'boolean') {
		return value;
	}

	const normalized = String(value).trim().toLowerCase();
	if (['1', 'true', 'yes', 'on'].includes(normalized)) {
		return true;
	}

	if (['0', 'false', 'no', 'off'].includes(normalized)) {
		return false;
	}

	return fallback;
}

function parseDomainList(value) {
	if (!value) {
		return [];
	}

	try {
		const parsed = JSON.parse(value);
		if (Array.isArray(parsed)) {
			return parsed;
		}
	} catch {
	}

	return value
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
}

function parseIntWithDefault(value, fallback) {
	if (value === undefined || value === '') {
		return fallback;
	}

	const parsed = Number(value);
	return Number.isNaN(parsed) ? fallback : parsed;
}

function getRedisClient() {
	if (!redisClient) {
		const redisUrl = readVar('REDIS_URL', 'KV_URL');

		if (redisUrl) {
			redisClient = new Redis(redisUrl, {
				lazyConnect: false,
				maxRetriesPerRequest: null
			});
		} else {
			const host = readVar('REDIS_HOST');

			if (!host) {
				throw new Error('Missing REDIS_URL or REDIS_HOST for Node runtime');
			}

			redisClient = new Redis({
				host,
				port: parseIntWithDefault(readVar('REDIS_PORT'), 6379),
				username: readVar('REDIS_USERNAME'),
				password: readVar('REDIS_PASSWORD'),
				db: parseIntWithDefault(readVar('REDIS_DB'), 0),
				lazyConnect: false,
				maxRetriesPerRequest: null
			});
		}
	}

	return redisClient;
}

function getPostgresClient() {
	if (!postgresClient) {
		const databaseUrl = readVar('DATABASE_URL', 'POSTGRES_URL');
		const ssl = parseBool(readVar('DATABASE_SSL'), false) ? 'require' : undefined;

		if (databaseUrl) {
			postgresClient = postgres(databaseUrl, {
				max: Number(readVar('PG_POOL_SIZE') || 10),
				ssl
			});
		} else {
			const host = readVar('DATABASE_HOST', 'PGHOST');
			const username = readVar('DATABASE_USER', 'PGUSER');
			const password = readVar('DATABASE_PASSWORD', 'PGPASSWORD');
			const database = readVar('DATABASE_NAME', 'PGDATABASE') || username;

			if (!host || !username || !password || !database) {
				throw new Error('Missing PostgreSQL connection settings for Node runtime');
			}

			postgresClient = postgres({
				host,
				port: parseIntWithDefault(readVar('DATABASE_PORT', 'PGPORT'), 5432),
				username,
				password,
				database,
				max: Number(readVar('PG_POOL_SIZE') || 10),
				ssl
			});
		}
	}

	return postgresClient;
}

export function createNodeEnv() {
	if (!kvAdapter) {
		kvAdapter = createRedisKv(getRedisClient());
	}

	if (!dbAdapter) {
		dbAdapter = createPgCompatDb(getPostgresClient());
	}

	return {
		db_dialect: 'pg',
		db: dbAdapter,
		pg: getPostgresClient(),
		kv: kvAdapter,
		domain: parseDomainList(readVar('MAIL_DOMAINS', 'DOMAIN', 'domain')),
		admin: readVar('ADMIN_EMAIL', 'ADMIN', 'admin'),
		jwt_secret: readVar('JWT_SECRET', 'jwt_secret'),
		orm_log: parseBool(readVar('ORM_LOG', 'orm_log'), false),
		linuxdo_switch: readVar('LINUXDO_SWITCH', 'linuxdo_switch'),
		project_link: readVar('PROJECT_LINK', 'project_link'),
		inbound_email_secret: readVar('INBOUND_EMAIL_SECRET', 'EMAIL_WEBHOOK_SECRET', 'inbound_email_secret'),
		linuxdo_client_id: readVar('LINUXDO_CLIENT_ID', 'linuxdo_client_id'),
		linuxdo_client_secret: readVar('LINUXDO_CLIENT_SECRET', 'linuxdo_client_secret'),
		linuxdo_callback_url: readVar('LINUXDO_CALLBACK_URL', 'linuxdo_callback_url')
	};
}

export async function closeNodeEnv() {
	const closeTasks = [];

	if (redisClient) {
		closeTasks.push(redisClient.quit().catch(() => redisClient.disconnect()));
	}

	if (postgresClient) {
		closeTasks.push(postgresClient.end({ timeout: 5 }));
	}

	await Promise.all(closeTasks);

	redisClient = undefined;
	postgresClient = undefined;
	kvAdapter = undefined;
	dbAdapter = undefined;
}
