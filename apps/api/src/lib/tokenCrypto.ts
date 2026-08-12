import crypto from 'crypto';

const PREFIX = 'enc:v1:';

export function isEncryptedToken(value: string | null): boolean {
  return Boolean(value?.startsWith(PREFIX));
}

function encryptionKey(): Buffer {
  const secret = process.env.TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret) throw new Error('TOKEN_ENCRYPTION_KEY or JWT_SECRET must be configured');
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptToken(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `${PREFIX}${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptToken(value: string | null): string | null {
  if (!value || !value.startsWith(PREFIX)) return value;
  const [ivValue, tagValue, encryptedValue] = value.slice(PREFIX.length).split('.');
  if (!ivValue || !tagValue || !encryptedValue) throw new Error('Stored provider token is invalid');

  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, 'base64url')), decipher.final()]).toString('utf8');
}
