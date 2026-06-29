import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;        // 96 bits, recommended for GCM
const AUTH_TAG_LENGTH = 16;  // 128 bits, default GCM tag size

export class CryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CryptoError";
  }
}

function getKey(): Buffer {
  const hex = process.env.ADLANCE_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new CryptoError(
      "ADLANCE_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). " +
      "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypt plaintext with AES-256-GCM.
 * Output format (base64): iv (12B) || authTag (16B) || ciphertext
 */
export function encryptKey(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

/**
 * Decrypt ciphertext produced by encryptKey().
 * Throws CryptoError on tamper, wrong key, or malformed input.
 */
export function decryptKey(cipherB64: string): string {
  let buf: Buffer;
  try {
    buf = Buffer.from(cipherB64, "base64");
  } catch {
    throw new CryptoError("Invalid base64 ciphertext");
  }
  if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new CryptoError("Ciphertext too short");
  }
  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  try {
    const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (e) {
    throw new CryptoError(`Decryption failed: ${e instanceof Error ? e.message : "unknown"}`);
  }
}
