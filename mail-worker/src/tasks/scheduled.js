import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import verifyRecordService from '../service/verify-record-service.js';
import userService from '../service/user-service.js';
import emailService from '../service/email-service.js';
import oauthService from '../service/oauth-service.js';

dayjs.extend(utc);
dayjs.extend(timezone);

const DEFAULT_TIMEZONE = 'Asia/Shanghai';
const DEFAULT_HOUR = 0;
const DEFAULT_MINUTE = 0;

const SCHEDULED_TASKS = [
	{
		name: 'clearVerifyRecords',
		run: (context) => verifyRecordService.clearRecord(context)
	},
	{
		name: 'resetDaySendCount',
		run: (context) => userService.resetDaySendCount(context)
	},
	{
		name: 'completeReceiveAll',
		run: (context) => emailService.completeReceiveAll(context)
	},
	{
		name: 'clearNoBindOauthUser',
		run: (context) => oauthService.clearNoBindOathUser(context)
	}
];

function createScheduledContext(env) {
	const state = new Map();

	return {
		env,
		get(key) {
			return state.get(key);
		},
		set(key, value) {
			state.set(key, value);
			return value;
		}
	};
}

function loggerInfo(logger, message) {
	if (typeof logger?.info === 'function') {
		logger.info(message);
		return;
	}

	logger?.log?.(message);
}

function loggerError(logger, message, error) {
	if (typeof logger?.error === 'function') {
		logger.error(message, error);
		return;
	}

	logger?.log?.(message, error);
}

export async function runScheduledTasks(env, logger = console) {
	const context = createScheduledContext(env);
	const startedAt = Date.now();
	const taskResults = [];

	for (const task of SCHEDULED_TASKS) {
		const taskStartedAt = Date.now();
		await task.run(context);
		taskResults.push({
			name: task.name,
			durationMs: Date.now() - taskStartedAt
		});
	}

	const durationMs = Date.now() - startedAt;
	loggerInfo(logger, `[scheduled] completed ${taskResults.length} tasks in ${durationMs}ms`);

	return {
		durationMs,
		taskResults
	};
}

export function getNextScheduledRun({
	now = dayjs(),
	timezone: targetTimezone = DEFAULT_TIMEZONE,
	hour = DEFAULT_HOUR,
	minute = DEFAULT_MINUTE
} = {}) {
	const zonedNow = dayjs(now).tz(targetTimezone);
	let nextRun = zonedNow
		.hour(hour)
		.minute(minute)
		.second(0)
		.millisecond(0);

	if (!nextRun.isAfter(zonedNow)) {
		nextRun = nextRun.add(1, 'day');
	}

	return nextRun;
}

export function startScheduledRunner({
	createEnv,
	logger = console,
	timezone: targetTimezone = DEFAULT_TIMEZONE,
	hour = DEFAULT_HOUR,
	minute = DEFAULT_MINUTE,
	runOnStart = false
} = {}) {
	if (typeof createEnv !== 'function') {
		throw new Error('startScheduledRunner requires a createEnv function');
	}

	let timer = null;
	let stopped = false;

	const scheduleNext = () => {
		if (stopped) {
			return;
		}

		const nextRun = getNextScheduledRun({
			timezone: targetTimezone,
			hour,
			minute
		});
		const delayMs = Math.max(nextRun.diff(dayjs()), 1_000);

		loggerInfo(
			logger,
			`[scheduled] next run at ${nextRun.format('YYYY-MM-DD HH:mm:ss')} (${targetTimezone})`
		);

		timer = setTimeout(async () => {
			timer = null;

			try {
				await runScheduledTasks(createEnv(), logger);
			} catch (error) {
				loggerError(logger, '[scheduled] run failed', error);
			} finally {
				scheduleNext();
			}
		}, delayMs);

		timer.unref?.();
	};

	const runImmediately = async () => {
		try {
			await runScheduledTasks(createEnv(), logger);
		} catch (error) {
			loggerError(logger, '[scheduled] initial run failed', error);
		} finally {
			scheduleNext();
		}
	};

	if (runOnStart) {
		queueMicrotask(runImmediately);
	} else {
		scheduleNext();
	}

	return () => {
		stopped = true;

		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
	};
}
