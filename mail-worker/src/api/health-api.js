import app from '../hono/hono.js';

app.get('/healthz', async (c) => {
	const checks = {
		db: { ok: false },
		kv: { ok: false }
	};
	let status = 200;

	try {
		await c.env.db.prepare('SELECT 1 AS ok').first();
		checks.db.ok = true;
	} catch (error) {
		status = 503;
		checks.db.error = error.message;
	}

	try {
		await c.env.kv.get('__healthcheck__');
		checks.kv.ok = true;
	} catch (error) {
		status = 503;
		checks.kv.error = error.message;
	}

	return c.json({
		code: status,
		message: status === 200 ? 'ok' : 'degraded',
		data: {
			status: status === 200 ? 'ok' : 'degraded',
			dbDialect: c.env.db_dialect || 'sqlite',
			checks
		}
	}, status);
});
