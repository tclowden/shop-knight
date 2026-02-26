const fs = require('fs');
const path = require('path');
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

async function authorize() {
  ensureSecretsDir();
  let client = loadSavedCredentialsIfExist();
  if (client) return client;

  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error(`Missing OAuth client file at ${CREDENTIALS_PATH}`);
  }

  client = await authenticate({
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
