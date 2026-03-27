globalThis.process.env.MAIL_DB_DIALECT ??= 'pg';

const [{ serve }, { default: app }, { closeNodeEnv, createNodeEnv }, { default: r2Service }, { startScheduledRunner }] = await Promise.all([
	import('@hono/node-server'),
	import('./hono/webs.js'),
	import('./platform/node-env.js'),
	import('./service/r2-service.js'),
	import('./tasks/scheduled.js')
]);

const port = Number(globalThis.process.env.PORT || 8787);
const scheduledEnabled = ['1', 'true', 'yes', 'on'].includes(String(globalThis.process.env.SCHEDULED_ENABLED || '').toLowerCase());
const scheduledRunOnStart = ['1', 'true', 'yes', 'on'].includes(String(globalThis.process.env.SCHEDULED_RUN_ON_START || '').toLowerCase());
const scheduledTimezone = globalThis.process.env.SCHEDULED_TIMEZONE || 'Asia/Shanghai';
const scheduledHour = Number(globalThis.process.env.SCHEDULED_HOUR || 0);
const scheduledMinute = Number(globalThis.process.env.SCHEDULED_MINUTE || 0);

let stopScheduledRunner = null;

async function fetchHandler(request) {
	const env = createNodeEnv();
	const url = new URL(request.url);

	if (url.pathname.startsWith('/api/')) {
		url.pathname = url.pathname.replace('/api', '');
		request = new Request(url.toString(), request);
		return app.fetch(request, env);
	}

	if (['/static/', '/attachments/'].some((prefix) => url.pathname.startsWith(prefix))) {
		return r2Service.toObjResp({ env, req: { path: url.pathname } }, url.pathname.substring(1));
	}

	return app.fetch(request, env);
}

serve({
	port,
	fetch: fetchHandler
});

if (scheduledEnabled) {
	stopScheduledRunner = startScheduledRunner({
		createEnv: createNodeEnv,
		logger: console,
		timezone: scheduledTimezone,
		hour: scheduledHour,
		minute: scheduledMinute,
		runOnStart: scheduledRunOnStart
	});
}

let shuttingDown = false;

async function shutdown(signal) {
	if (shuttingDown) {
		return;
	}

	shuttingDown = true;
	stopScheduledRunner?.();
	await closeNodeEnv();
	console.log(`Cloud Mail API stopped after ${signal}`);
	globalThis.process.exit(0);
}

globalThis.process.on('SIGINT', () => {
	shutdown('SIGINT').catch((error) => {
		console.error('Failed to stop Node runtime cleanly', error);
		globalThis.process.exit(1);
	});
});

globalThis.process.on('SIGTERM', () => {
	shutdown('SIGTERM').catch((error) => {
		console.error('Failed to stop Node runtime cleanly', error);
		globalThis.process.exit(1);
	});
});

console.log(`Cloud Mail API listening on http://127.0.0.1:${port}`);
