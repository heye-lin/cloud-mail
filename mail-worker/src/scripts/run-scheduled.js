globalThis.process.env.MAIL_DB_DIALECT ??= 'pg';

const [{ closeNodeEnv, createNodeEnv }, { runScheduledTasks }] = await Promise.all([
	import('../platform/node-env.js'),
	import('../tasks/scheduled.js')
]);

try {
	await runScheduledTasks(createNodeEnv(), console);
	await closeNodeEnv();
} catch (error) {
	console.error('[scheduled] one-off run failed', error);
	await closeNodeEnv().catch(() => {});
	globalThis.process.exit(1);
}
