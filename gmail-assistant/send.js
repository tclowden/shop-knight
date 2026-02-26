const { authorize, google } = require('./lib');

function usage() {
  console.log('Usage: node send.js "to@example.com" "Subject" "Body text" "optional-cc@example.com"');
}

function makeRawMessage(to, subject, body, cc) {
  const email = [
    `To: ${to}`,
    cc ? `Cc: ${cc}` : null,
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    '',
    body,
  ].filter(Boolean).join('\n');

  return Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

(async () => {
  const [to, subject, body, cc] = process.argv.slice(2);
  if (!to || !subject || !body) {
    usage();
    process.exit(1);
  }

  try {
    const auth = await authorize();
    const gmail = google.gmail({ version: 'v1', auth });
    const raw = makeRawMessage(to, subject, body, cc);

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
