const { authorize, google } = require('./lib');

function usage() {
  console.log('Usage: node send.js "to@example.com" "Subject" "Body text"');
}

function makeRawMessage(to, subject, body) {
  const email = [
    `To: ${to}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    '',
    body,
  ].join('\n');

  return Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

(async () => {
  const [to, subject, body] = process.argv.slice(2);
  if (!to || !subject || !body) {
    usage();
    process.exit(1);
  }

  try {
    const auth = await authorize();
    const gmail = google.gmail({ version: 'v1', auth });
    const raw = makeRawMessage(to, subject, body);

    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });

    console.log(`✅ Sent. Gmail message id: ${result.data.id}`);
  } catch (err) {
    console.error('Failed to send Gmail:', err.message);
    process.exit(1);
  }
})();
