import { describe, it, expect, beforeAll } from "vitest";
import { encryptKey, decryptKey, CryptoError } from "../crypto";

beforeAll(() => {
  // Vitest reads .env.local automatically; ADLANCE_ENCRYPTION_KEY must be set.
  if (!process.env.ADLANCE_ENCRYPTION_KEY) {
    throw new Error("ADLANCE_ENCRYPTION_KEY missing in test env");
  }
});

describe("crypto", () => {
  it("encrypts then decrypts a string round-trip", () => {
    const plaintext = "sk-ant-api03-abc123-XYZ";
    const cipher = encryptKey(plaintext);
    expect(cipher).not.toEqual(plaintext);
    expect(decryptKey(cipher)).toEqual(plaintext);
  });

  it("produces different ciphertexts for the same plaintext (random IV)", () => {
    const plaintext = "sk-ant-api03-same";
    const c1 = encryptKey(plaintext);
    const c2 = encryptKey(plaintext);
    expect(c1).not.toEqual(c2);
    expect(decryptKey(c1)).toEqual(plaintext);
    expect(decryptKey(c2)).toEqual(plaintext);
  });

  it("throws CryptoError on tampered ciphertext", () => {
    const cipher = encryptKey("secret");
    // Flip one character in the middle (auth tag region)
    const tampered = cipher.slice(0, -4) + "0000";
    expect(() => decryptKey(tampered)).toThrow(CryptoError);
  });

  it("throws CryptoError on malformed ciphertext", () => {
    expect(() => decryptKey("not-valid-base64!@#")).toThrow(CryptoError);
    expect(() => decryptKey("")).toThrow(CryptoError);
  });

  it("handles unicode and long strings", () => {
    const plaintext = "🔑 emoji + " + "a".repeat(1000);
    expect(decryptKey(encryptKey(plaintext))).toEqual(plaintext);
  });
});
