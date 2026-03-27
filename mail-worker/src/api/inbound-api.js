import app from '../hono/hono.js';
import result from '../model/result.js';
import inboundEmailService from '../service/inbound-email-service.js';

function normalizeBase64(value) {
	return String(value || '')
		.trim()
		.replace(/-/g, '+')
		.replace(/_/g, '/');
}

function decodeBase64ToBytes(value) {
	const normalized = normalizeBase64(value);

	if (!normalized) {
		return null;
	}

	const binary = atob(normalized);
	const bytes = new Uint8Array(binary.length);

	for (let index = 0; index < binary.length; index++) {
		bytes[index] = binary.charCodeAt(index);
	}

	return bytes;
}

function getBearerToken(value) {
	if (!value) {
		return '';
	}

	const normalized = String(value).trim();

	if (normalized.toLowerCase().startsWith('bearer ')) {
		return normalized.slice(7).trim();
	}

	return normalized;
}

function getInboundSecret(c) {
	return c.env.inbound_email_secret || c.env.inboundEmailSecret || '';
}

function getProvidedSecret(c) {
	return c.req.header('x-inbound-secret') || getBearerToken(c.req.header('authorization')) || c.req.query('secret') || '';
}

function firstDefined(source, keys) {
	for (const key of keys) {
		const value = source[key];

		if (value !== undefined && value !== null && value !== '') {
			return value;
		}
	}

	return null;
}

function formValueToPayload(value) {
	if (value === null || value === undefined || value === '') {
		return null;
	}

	if (typeof value === 'string') {
		return value;
	}

	return value;
}

function buildDefaultPayload(c) {
	return {
		raw: null,
		to: c.req.header('x-envelope-to') || c.req.header('x-original-to') || c.req.query('to') || '',
		from: c.req.header('x-envelope-from') || c.req.header('return-path') || c.req.query('from') || ''
	};
}

function payloadFromJson(body, defaults) {
	return {
		raw: firstDefined(body, ['raw', 'mime', 'email', 'message', 'bodyMime', 'body_mime']) || null,
		to: firstDefined(body, ['to', 'recipient', 'envelopeTo', 'envelope_to']) || defaults.to,
		from: firstDefined(body, ['from', 'sender', 'envelopeFrom', 'envelope_from', 'returnPath']) || defaults.from
	};
}

function payloadFromFormData(formData, defaults) {
	const values = Object.fromEntries(formData.entries());
	const rawBase64 = firstDefined(values, ['raw_base64', 'mime_base64', 'body_mime_base64', 'body-mime-base64']);

	return {
		raw: rawBase64
			? decodeBase64ToBytes(rawBase64)
			: formValueToPayload(firstDefined(values, ['raw', 'mime', 'email', 'message', 'raw_email', 'body-mime', 'body_mime'])),
		to: firstDefined(values, ['to', 'recipient', 'envelope_to', 'envelope-to']) || defaults.to,
		from: firstDefined(values, ['from', 'sender', 'envelope_from', 'envelope-from', 'return-path']) || defaults.from
	};
}

function unauthorizedResponse(c, expectedSecret) {
	if (!expectedSecret) {
		return c.json(result.fail('Inbound email secret not configured', 503), 503);
	}

	return c.json(result.fail('Unauthorized', 401), 401);
}

async function handleInboundWebhook(c) {
	const expectedSecret = getInboundSecret(c);

	if (getProvidedSecret(c) !== expectedSecret) {
		return unauthorizedResponse(c, expectedSecret);
	}

	const defaults = buildDefaultPayload(c);
	let payload = defaults;

	const contentType = c.req.header('content-type') || '';

	if (contentType.includes('application/json')) {
		const body = await c.req.json();
		payload = payloadFromJson(body, defaults);
	} else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
		payload = payloadFromFormData(await c.req.formData(), defaults);
	} else {
		payload = {
			...defaults,
			raw: await c.req.arrayBuffer()
		};
	}

	if (!payload.raw) {
		return c.json(result.fail('Raw email payload is required', 400), 400);
	}

	const receiveResult = await inboundEmailService.receive(c, payload);
	return c.json(result.ok(receiveResult));
}

async function handlePostmarkWebhook(c) {
	const expectedSecret = getInboundSecret(c);

	if (getProvidedSecret(c) !== expectedSecret) {
		return unauthorizedResponse(c, expectedSecret);
	}

	const body = await c.req.json();
	const receiveResult = await inboundEmailService.receivePostmark(c, body);
	return c.json(result.ok(receiveResult));
}

app.post('/webhooks/inbound-email', handleInboundWebhook);
app.post('/webhooks/inbound-email/mime', handleInboundWebhook);
app.post('/webhooks/inbound-email/raw-mime', handleInboundWebhook);
app.post('/webhooks/inbound-email/postmark', handlePostmarkWebhook);
