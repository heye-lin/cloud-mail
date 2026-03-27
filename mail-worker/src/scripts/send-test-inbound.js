const webhookUrl = process.env.INBOUND_WEBHOOK_URL || 'http://127.0.0.1:8787/api/webhooks/inbound-email';
const secret = process.env.INBOUND_EMAIL_SECRET || process.env.EMAIL_WEBHOOK_SECRET;
const to = process.env.TEST_TO || 'nobody@example.com';
const from = process.env.TEST_FROM || 'sender@example.org';
const subject = process.env.TEST_SUBJECT || 'Inbound webhook test';
const body = process.env.TEST_BODY || 'hello from send-test-inbound.js';

if (!secret) {
	console.error('Missing INBOUND_EMAIL_SECRET or EMAIL_WEBHOOK_SECRET');
	process.exit(1);
}

const mime = [
	`From: ${from}`,
	`To: ${to}`,
	`Subject: ${subject}`,
	`Message-ID: <test-${Date.now()}@local>`,
	'Content-Type: text/plain; charset=utf-8',
	'',
	body
].join('\r\n');

const response = await fetch(webhookUrl, {
	method: 'POST',
	headers: {
		Authorization: `Bearer ${secret}`,
		'X-Envelope-To': to,
		'X-Envelope-From': from,
		'Content-Type': 'message/rfc822'
	},
	body: mime
});

const text = await response.text();

console.log(`status=${response.status}`);
console.log(text);

if (!response.ok) {
	process.exit(1);
}
