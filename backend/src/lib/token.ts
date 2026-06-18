import crypto from "node:crypto";

import { env } from "../config/env.js";

export type AuthTokenPayload = {
  sub: string;
  role: "STUDENT" | "COLLEGE" | "ADMIN";
  exp: number;
};

function base64UrlEncode(input: string): string {
  return Buffer.from(input).toString("base64url");
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(unsignedToken: string): string {
  return crypto.createHmac("sha256", env.AUTH_SECRET).update(unsignedToken).digest("base64url");
}

export function createAuthToken(payload: AuthTokenPayload): string {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  const left = Buffer.from(signature, "utf8");
  const right = Buffer.from(expectedSignature, "utf8");

  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as AuthTokenPayload;
    if (!payload.sub || !payload.role || !payload.exp) {
      return null;
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
