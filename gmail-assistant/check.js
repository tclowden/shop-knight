const { authorize, google } = require('./lib');

function header(headers, name) {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
}

(async () => {
  try {
    const auth = await authorize();
    const gmail = google.gmail({ version: 'v1', auth });

    const max = Number(process.argv[2] || 10);
    const query = process.argv.slice(3).join(' ') || 'is:unread in:inbox';

    const list = await gmail.users.messages.list({
      userId: 'me',
      maxResults: max,
      q: query,
    });

    const messages = list.data.messages || [];
    if (!messages.length) {
      console.log('No messages found.');
      return;
    }

    for (const m of messages) {
      const detail = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'metadata' });
      const h = detail.data.payload?.headers || [];
      const line = [
        `- ${header(h, 'Date')}`,
        `From: ${header(h, 'From')}`,
        `Subject: ${header(h, 'Subject')}`,
        `ID: ${m.id}`,
      ].join(' | ');
      console.log(line);
    }
  } catch (err) {
    console.error('Failed to check Gmail:', err.message);
    process.exit(1);
  }
})();
