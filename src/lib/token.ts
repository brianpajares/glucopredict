import "server-only";
import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from "node:crypto";
import { tokenSecret } from "./env";

/**
 * Tokens cifrados AES-256-GCM (confidencialidad + integridad), base64url, con tipo y caducidad.
 * Sirven para enlaces de desbloqueo y para cifrar en reposo el payload de una compra.
 * Nunca llevan datos en claro: el payload clínico y el email viajan cifrados (PRD §22).
 */

export type TokenKind = "unlock" | "payload";

interface Envelope<T> {
  k: TokenKind;
  e: number; // expira (epoch s)
  d: T;
}

export class TokenError extends Error {
  constructor(public readonly reason: "no_secret" | "malformed" | "tampered" | "expired" | "wrong_kind") {
    super(`token_${reason}`);
    this.name = "TokenError";
  }
}

function key(secret: string): Buffer {
  return Buffer.from(hkdfSync("sha256", secret, "glucopredict-token-salt-v1", "aes-256-gcm-key", 32));
}

export function seal<T>(kind: TokenKind, data: T, ttlDays: number, secret = tokenSecret()): string {
  if (!secret) throw new TokenError("no_secret");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  const env: Envelope<T> = { k: kind, e: Math.floor(Date.now() / 1000) + Math.round(ttlDays * 86400), d: data };
  const ct = Buffer.concat([cipher.update(JSON.stringify(env), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64url");
}

export function open<T>(kind: TokenKind, token: string, secret = tokenSecret()): T {
  if (!secret) throw new TokenError("no_secret");
  let raw: Buffer;
  try {
    raw = Buffer.from(token, "base64url");
  } catch {
    throw new TokenError("malformed");
  }
  if (raw.length < 12 + 16 + 2) throw new TokenError("malformed");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const ct = raw.subarray(28);
  let env: Envelope<T>;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(secret), iv);
    decipher.setAuthTag(tag);
    env = JSON.parse(Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8")) as Envelope<T>;
  } catch {
    throw new TokenError("tampered");
  }
  if (env.k !== kind) throw new TokenError("wrong_kind");
  if (typeof env.e !== "number" || env.e < Math.floor(Date.now() / 1000)) throw new TokenError("expired");
  return env.d;
}

/** Hash determinista del email para búsquedas sin guardar el email en claro. */
export function emailHash(email: string, secret = tokenSecret()): string {
  return createHmac("sha256", secret ?? "no-secret").update(email.trim().toLowerCase()).digest("hex");
}

/** ID de verificación opaco: HMAC(versión + inputs canonizados) con sal privada del servidor. */
export function verificationId(canonicalInputs: string, modelVersion: string, secret = tokenSecret()): string {
  const h = createHmac("sha256", secret ?? "glucopredict-dev-salt").update(`${modelVersion}|${canonicalInputs}`).digest("hex").toUpperCase();
  return `GP-${h.slice(0, 4)}-${h.slice(4, 8)}-${h.slice(8, 12)}`;
}

export function canonicalize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalize(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
