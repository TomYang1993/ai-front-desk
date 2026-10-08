/**
 * Signed session tokens, shared by the proxy and the server. Uses only Web
 * Crypto, so it runs anywhere and does not import server-only modules.
 *
 * A token is base64url(JSON payload) + "." + base64url(HMAC-SHA256). The
 * payload is readable but cannot be changed without the secret.
 */
import type { CenterId } from "@/content/types";

export const SESSION_COOKIE = "afd_session";
export const SESSION_DAYS = 7;

export type Session =
  | { role: "parent"; centerId: CenterId; familyId: string; exp: number }
  | { role: "director"; centerId: CenterId; staffId: string; exp: number };

/**
 * Sign-in is simulated and every demo account is public, so a forged
 * cookie gains nothing a reviewer can't get with one click. Set
 * SESSION_SECRET anyway so a real sign-in can drop in later.
 */
const secret = () => process.env.SESSION_SECRET || "afd-demo-session-secret-not-for-production-data";

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

const key = () => crypto.subtle.importKey("raw", encoder.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);

export async function signSession(session: Session): Promise<string> {
  const payload = toBase64Url(encoder.encode(JSON.stringify(session)));
  const signature = await crypto.subtle.sign("HMAC", await key(), encoder.encode(payload));
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

/** The session in a token, or null when it is missing, tampered with or expired. */
export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await key(), fromBase64Url(signature), encoder.encode(payload));
    if (!ok) return null;
    const session = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as Session;
    if (typeof session.exp !== "number" || session.exp < Date.now()) return null;
    if (session.role !== "parent" && session.role !== "director") return null;
    return session;
  } catch {
    return null;
  }
}

export const homeFor = (session: Session) => (session.role === "director" ? "/console" : "/");
