import { Router, type IRouter } from "express";
import { SubmitContactBody, SubmitContactResponse } from "@workspace/api-zod";
import { sendError } from "../lib/errors";
import { contactLimiter } from "../middlewares/rateLimit";
import { createContactMessage } from "../services/contact";

const router: IRouter = Router();

router.post("/contact", contactLimiter, async (req, res) => {
  const body = SubmitContactBody.safeParse(req.body);
  if (!body.success) {
    sendError(res, 400, "validation_error", "Please check the form and try again", { issues: body.error.issues });
    return;
  }
  const { website, ...input } = body.data;
  // Honeypot: bots fill the hidden field. Pretend success, store nothing.
  if (website) {
    res.status(201).json(SubmitContactResponse.parse({ ok: true }));
    return;
  }
  await createContactMessage(input, req.ip, req.auth?.user.id);
  res.status(201).json(SubmitContactResponse.parse({ ok: true }));
});

export default router;
