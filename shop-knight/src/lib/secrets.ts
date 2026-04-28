import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getSecretKey() {
  const source = process.env.COMPANY_CREDENTIALS_SECRET || process.env.APP_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || '';
  if (!source) throw new Error('Missing encryption secret. Set COMPANY_CREDENTIALS_SECRET, APP_ENCRYPTION_KEY, or NEXTAUTH_SECRET.');
  return createHash('sha256').update(source).digest();
}

export function encryptSecret(value: string) {
  const plain = String(value || '');
  if (!plain) return null;

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getSecretKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSecret(value: string | null | undefined) {
  if (!value) return null;

  const [ivB64, tagB64, encryptedB64] = String(value).split(':');
  if (!ivB64 || !tagB64 || !encryptedB64) throw new Error('Encrypted secret has invalid format.');

  const decipher = createDecipheriv(ALGORITHM, getSecretKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedB64, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function maskSecret(value: string | null | undefined, visible = 4) {
  const str = String(value || '');
  if (!str) return '';
  if (str.length <= visible) return '•'.repeat(str.length);
  return `${'•'.repeat(Math.max(4, str.length - visible))}${str.slice(-visible)}`;
}
