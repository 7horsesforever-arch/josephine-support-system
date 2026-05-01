import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

type EncryptedSecret = {
  encryptedValue: string;
  iv: string;
  authTag: string;
};

const algorithm = "aes-256-gcm";

function getEncryptionKey(envName = "CANVAS_TOKEN_ENCRYPTION_KEY") {
  const rawKey = process.env[envName];
  if (!rawKey) {
    throw new Error(`${envName} is required to save encrypted tokens.`);
  }

  if (/^[A-Za-z0-9+/=]{44}$/.test(rawKey)) {
    return Buffer.from(rawKey, "base64");
  }

  return createHash("sha256").update(rawKey).digest();
}

export function encryptSecret(value: string, envName?: string): EncryptedSecret {
  const key = getEncryptionKey(envName);
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  return {
    encryptedValue: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptSecret(secret: EncryptedSecret, envName?: string) {
  const key = getEncryptionKey(envName);
  const decipher = createDecipheriv(
    algorithm,
    key,
    Buffer.from(secret.iv, "base64"),
  );

  decipher.setAuthTag(Buffer.from(secret.authTag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(secret.encryptedValue, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
