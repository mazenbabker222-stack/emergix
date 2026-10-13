import type { Response } from "express";

/** Public, read-only data: revalidated on every request through the ETag, so DB edits show on reload. */
export function publicCache(res: Response) {
  res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
}
