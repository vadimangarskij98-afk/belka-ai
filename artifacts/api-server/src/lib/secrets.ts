import crypto from "crypto";
import { IS_PRODUCTION, JWT_SECRET } from "../config";

const SECRET_PREFIX = "enc:v1";
const ENV_TOKEN_ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY?.trim();

if (IS_PRODUCTION && !ENV_TOKEN_ENCRYPTION_KEY) {
  throw new Error("TOKEN_ENCRYPTION_KEY is required in production");
}

const KEY_SOURCE = ENV_TOKEN_ENCRYPTION_KEY || JWT_SECRET;
const KEY = crypto.createHash("sha256").update(KEY_SOURCE).digest();

export function encryptSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith(`${SECRET_PREFIX}:`)) return value;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${SECRET_PREFIX}:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith(`${SECRET_PREFIX}:`)) return value;

  const [, ivRaw, tagRaw, payloadRaw] = value.split(":");
  if (!ivRaw || !tagRaw || !payloadRaw) return null;

  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      KEY,
      Buffer.from(ivRaw, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payloadRaw, "base64url")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}
