import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/** Marker shape stored in place of the plaintext JSON value once encrypted. */
interface EncryptedPayload {
  __enc: string;
}

function isEncryptedPayload(value: unknown): value is EncryptedPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).__enc === 'string'
  );
}

function getKey(): Buffer {
  const keyHex = process.env.FIELD_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error(
      'FATAL: FIELD_ENCRYPTION_KEY environment variable is required (generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))")',
    );
  }
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) {
    throw new Error(
      'FIELD_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)',
    );
  }
  return key;
}

/**
 * Encrypts a JSON-serializable value for storage in a Prisma Json column.
 * Returns null/undefined unchanged so optional fields stay optional.
 */
export function encryptJsonField(value: unknown): EncryptedPayload | null {
  if (value === null || value === undefined) return null;

  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return { __enc: Buffer.concat([iv, authTag, encrypted]).toString('base64') };
}

/**
 * Decrypts a value previously produced by encryptJsonField. Values that
 * don't match the encrypted shape (e.g. legacy plaintext JSON written before
 * this field started being encrypted) are returned unchanged, so existing
 * data keeps working until it's next written and gets encrypted then.
 */
export function decryptJsonField(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (!isEncryptedPayload(value)) return value;

  const key = getKey();
  const payload = Buffer.from(value.__enc, 'base64');
  const iv = payload.subarray(0, IV_LENGTH);
  const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString('utf8'));
}
