import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

/**
 * AES-256-GCM encryption for user-provided API keys at rest.
 * Key material: INTEGRATION_ENCRYPTION_KEY env var, falling back to a
 * key derived from NEXTAUTH_SECRET (always present in this app).
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const secret =
    process.env.INTEGRATION_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || "";
  if (!secret) {
    throw new Error(
      "No encryption key configured (set INTEGRATION_ENCRYPTION_KEY or NEXTAUTH_SECRET)",
    );
  }
  // Derive a stable 32-byte key via scrypt
  cachedKey = scryptSync(secret, "stackscout-integrations", 32);
  return cachedKey;
}

/** Encrypt a plaintext secret → "v1:<iv>:<tag>:<ciphertext>" (base64url parts). */
export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

/** Decrypt a value produced by encryptSecret. */
export function decryptSecret(stored: string): string {
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Unrecognized encrypted key format");
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const key = getKey();
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(ivB64, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/** Mask a secret for display — shows prefix only. */
export function maskSecret(secret: string): string {
  if (secret.length <= 8) return "••••••••";
  return `${secret.slice(0, 4)}••••••••${secret.slice(-4)}`;
}
