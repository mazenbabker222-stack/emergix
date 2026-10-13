import { randomBytes, scryptSync } from "node:crypto";

/**
 * Demo-user password hashing.
 * Format "<salt-hex>:<key-hex>" with scrypt N=16384 r=16 p=1 dkLen=64 and NFKC-normalised input, which is the
 * format Better Auth's default hasher uses. Phase 03's Better Auth config uses the default hasher, so verify once that a seeded demo user can sign in
 * (demo users are created with emailVerified = true); if parameters differ, change them here.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password.normalize("NFKC"), salt, 64, { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 });
  return `${salt}:${key.toString("hex")}`;
}

/** Random, unguessable demo password. Printed once by the seed script; never stored in plain text. */
export function randomPassword(): string {
  return randomBytes(18).toString("base64url");
}
