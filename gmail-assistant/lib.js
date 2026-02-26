const fs = require('fs');
const path = require('path');
const http = require('http');
const { URL } = require('url');
const { authenticate } = require('@google-cloud/local-auth');
const { google } = require('googleapis');

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
];

const HOME = process.env.HOME || '/home/knight';
const SECRETS_DIR = process.env.GMAIL_SECRETS_DIR || path.join(HOME, '.openclaw', 'secrets');
const CREDENTIALS_PATH = process.env.GMAIL_CREDENTIALS_PATH || path.join(SECRETS_DIR, 'gmail-oauth-client.json');
const TOKEN_PATH = process.env.GMAIL_TOKEN_PATH || path.join(SECRETS_DIR, 'gmail-token.json');

function ensureSecretsDir() {
  fs.mkdirSync(SECRETS_DIR, { recursive: true, mode: 0o700 });
}

function loadSavedCredentialsIfExist() {
  try {
    const content = fs.readFileSync(TOKEN_PATH, 'utf8');
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch {
    return null;
  }
}

function saveCredentials(client) {
  const content = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  }, null, 2);
  fs.writeFileSync(TOKEN_PATH, `${payload}\n`, { mode: 0o600 });
}

async function authorizeManual() {
  const content = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const redirectUri = (key.redirect_uris || []).find((u) => u.includes('localhost')) || key.redirect_uris?.[0];

  if (!redirectUri) {
    throw new Error('OAuth client has no redirect URI. Re-download Desktop app credentials.');
  }

  const oauth2Client = new google.auth.OAuth2(key.client_id, key.client_secret, redirectUri);
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log('\nOpen this URL in your browser and approve access:\n');
  console.log(authUrl);
  console.log('\nWaiting for callback...\n');

  const parsed = new URL(redirectUri);
  const port = Number(parsed.port || 80);
  const pathname = parsed.pathname || '/';

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const reqUrl = new URL(req.url, `http://localhost:${port}`);
      if (reqUrl.pathname !== pathname) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const authCode = reqUrl.searchParams.get('code');
      if (!authCode) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Missing code in callback.');
        server.close();
        reject(new Error('Missing auth code in callback'));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Gmail auth complete. You can close this tab and return to terminal.');
      server.close();
      resolve(authCode);
    });

    server.listen(port, '127.0.0.1');
    server.on('error', (err) => reject(err));
  });

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
}

async function authorize() {
  ensureSecretsDir();
  let client = loadSavedCredentialsIfExist();
  if (client) return client;

  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error(`Missing OAuth client file at ${CREDENTIALS_PATH}`);
  }

  const noBrowser = process.env.GMAIL_NO_BROWSER === '1';
  client = noBrowser
    ? await authorizeManual()
    : await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH,
      });

  if (client.credentials?.refresh_token) {
    saveCredentials(client);
  }
  return client;
}

function decodeBody(payload) {
  const part = payload?.parts?.find((p) => p.mimeType === 'text/plain') || payload;
  const data = part?.body?.data;
  if (!data) return '';
  const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64').toString('utf8');
}

module.exports = {
  authorize,
  google,
  decodeBody,
  paths: { SECRETS_DIR, CREDENTIALS_PATH, TOKEN_PATH },
};
