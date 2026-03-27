const webhookUrl = process.env.INBOUND_WEBHOOK_URL || 'http://127.0.0.1:8787/api/webhooks/inbound-email';
const secret = process.env.INBOUND_EMAIL_SECRET || process.env.EMAIL_WEBHOOK_SECRET;
const envelopeTo = process.env.ENVELOPE_TO || process.env.RELAY_ENVELOPE_TO || '';
const envelopeFrom = process.env.ENVELOPE_FROM || process.env.RELAY_ENVELOPE_FROM || '';

if (!secret) {
	console.error('Missing INBOUND_EMAIL_SECRET or EMAIL_WEBHOOK_SECRET');
	process.exit(1);
}

const chunks = [];

for await (const chunk of process.stdin) {
	chunks.push(chunk);
}

const body = Buffer.concat(chunks);

if (body.length === 0) {
	console.error('No MIME payload received on stdin');
	process.exit(1);
}

const response = await fetch(webhookUrl, {
	method: 'POST',
	headers: {
		Authorization: `Bearer ${secret}`,
		'Content-Type': 'message/rfc822',
		...(envelopeTo ? { 'X-Envelope-To': envelopeTo } : {}),
		...(envelopeFrom ? { 'X-Envelope-From': envelopeFrom } : {})
	},
	body
});

const text = await response.text();

console.log(`status=${response.status}`);
console.log(text);

if (!response.ok) {
	process.exit(1);
}
