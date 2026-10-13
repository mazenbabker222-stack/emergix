import { Router, type IRouter } from 'express';
import { getOutbox } from '../lib/mailer';

/** Mounted only when E2E_TEST_HOOKS=1 and NODE_ENV is not production. */
const router: IRouter = Router();

router.get('/outbox', (req, res) => {
  const to = typeof req.query.to === 'string' ? req.query.to : undefined;
  res.json(getOutbox(to).map((m) => ({ to: m.to, subject: m.subject, text: m.text, sentAt: m.sentAt })));
});

export default router;
