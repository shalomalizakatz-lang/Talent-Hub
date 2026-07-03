import { Router } from 'express';
import crypto from 'node:crypto';
import { env } from '../env.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const authRouter = Router();

function timingSafeStringEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    // still run a comparison to keep timing roughly constant
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { password } = req.body || {};
    if (typeof password !== 'string' || !timingSafeStringEqual(password, env.SHARED_PASSWORD)) {
      return res.status(401).json({ error: 'Incorrect password' });
    }
    req.session.authenticated = true;
    res.json({ authenticated: true });
  })
);

authRouter.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('th.sid');
    res.json({ authenticated: false });
  });
});

authRouter.get('/session', (req, res) => {
  res.json({ authenticated: Boolean(req.session && req.session.authenticated) });
});
