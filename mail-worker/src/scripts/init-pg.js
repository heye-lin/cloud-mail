import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

function readVar(...keys) {
	for (const key of keys) {
		const value = process.env[key];
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

	const normalized = String(value).trim().toLowerCase();
	if (['1', 'true', 'yes', 'on'].includes(normalized)) {
		return true;
	}

	if (['0', 'false', 'no', 'off'].includes(normalized)) {
		return false;
	}

	return fallback;
}

function buildClient() {
	const databaseUrl = readVar('DATABASE_URL', 'POSTGRES_URL');
	const ssl = parseBool(readVar('DATABASE_SSL'), false) ? 'require' : undefined;

	if (databaseUrl) {
		return postgres(databaseUrl, { max: 1, ssl });
	}

	const host = readVar('DATABASE_HOST', 'PGHOST');
	const username = readVar('DATABASE_USER', 'PGUSER');
	const password = readVar('DATABASE_PASSWORD', 'PGPASSWORD');
	const database = readVar('DATABASE_NAME', 'PGDATABASE') || username;

	if (!host || !username || !password || !database) {
		throw new Error('Missing PostgreSQL connection settings');
	}

	return postgres({
		host,
		port: Number(readVar('DATABASE_PORT', 'PGPORT') || 5432),
		username,
		password,
		database,
		max: 1,
		ssl
	});
}

function splitStatements(sqlText) {
	return sqlText
		.split(/;\s*\n/g)
		.map((statement) => statement.trim())
		.filter(Boolean);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlFile = path.resolve(__dirname, '../../migrations/postgres/001_init.sql');
const sqlText = await fs.readFile(sqlFile, 'utf8');
const statements = splitStatements(sqlText);
const client = buildClient();

try {
	await client.begin(async (tx) => {
		for (const statement of statements) {
			await tx.unsafe(statement);
		}
	});

	console.log(`Applied PostgreSQL init script: ${sqlFile}`);
} finally {
	await client.end({ timeout: 5 });
}
