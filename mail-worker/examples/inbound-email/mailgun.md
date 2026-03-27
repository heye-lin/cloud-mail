# Mailgun Route Example

Mailgun route forwarding can post inbound email directly to the Node webhook.

Recommended target:

```text
https://mail-api.example.com/api/webhooks/inbound-email/mime?secret=replace-me
```

Use the `/mime` suffix so Mailgun includes the raw MIME in the `body-mime` field. The webhook already understands Mailgun-style fields such as:

- `recipient`
- `sender`
- `body-mime`

Example route creation script:

```bash
MAILGUN_API_KEY=key-xxxx \
MAILGUN_WEBHOOK_BASE=https://mail-api.example.com \
INBOUND_EMAIL_SECRET=replace-me \
bash examples/inbound-email/mailgun-route.sh
```

If you prefer the Mailgun UI instead of the API:

1. Create a receiving route that matches your inbound domain.
2. Add a `forward()` action to the `/api/webhooks/inbound-email/mime?secret=...` URL.
3. Add `stop()` after the forward action so Mailgun does not continue evaluating lower-priority routes unless you want it to.
