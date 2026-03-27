# Postfix Pipe Example

If your MTA can pipe the full MIME message to a command, you can forward it into the Node webhook with the stdin bridge.

Bridge script:

```text
src/scripts/relay-inbound-stdin.js
```

Example wrapper:

```text
examples/inbound-email/postfix-pipe.sh
```

The wrapper expects:

- argument 1: envelope sender
- argument 2: envelope recipient
- stdin: raw MIME message

Required environment:

```bash
INBOUND_WEBHOOK_URL=https://mail-api.example.com/api/webhooks/inbound-email
INBOUND_EMAIL_SECRET=replace-me
```

Example conceptual Postfix pipe transport:

```text
argv=/bin/bash /root/cloud-mail/mail-worker/examples/inbound-email/postfix-pipe.sh ${sender} ${recipient}
```

The script exports `ENVELOPE_FROM` and `ENVELOPE_TO`, then posts the stdin MIME payload to the Cloud Mail webhook as `message/rfc822`.
