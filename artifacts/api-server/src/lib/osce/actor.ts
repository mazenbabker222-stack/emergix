import type { Request } from "express";
import { forbidden } from "../http-error";

export function actorOf(req: Request): { id: string; authenticated: true } {
  if (!req.auth?.user.id) throw forbidden("Please sign in to continue", "unauthenticated");
  return { id: req.auth.user.id, authenticated: true };
}
