import { createHash } from "node:crypto";

/** Deterministic UUID (v5-style) so re-running the seed hits the same primary keys. */
export function detId(namespace: string, key: string): string {
  const h = createHash("sha1").update(`exam-platform-seed:${namespace}:${key}`).digest();
  h[6] = (h[6]! & 0x0f) | 0x50;
  h[8] = (h[8]! & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString("hex");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20, 32)}`;
}
