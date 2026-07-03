import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import helmet from 'helmet';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './env.js';
import { pool } from './db/pool.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.js';
import { jobSeekersRouter } from './routes/jobSeekers.js';
import { opportunitiesRouter } from './routes/opportunities.js';
import { matchesRouter } from './routes/matches.js';
import { publicRouter } from './routes/public.js';
import { LOCAL_UPLOAD_DIR } from './lib/storage.js';
import { renderLoginHtml } from './lib/renderHtml.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PgSession = connectPgSimple(session);

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false, // SPA served separately in dev; keep simple for v1
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.use(
    session({
      store: new PgSession({ pool, tableName: 'session', createTableIfMissing: true }),
      name: 'th.sid',
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
    })
  );

  // Local-disk resume fallback (dev only — production should use S3-compatible storage)
  app.use('/uploads', express.static(LOCAL_UPLOAD_DIR));

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  app.use('/api/auth', authRouter);
  app.use('/api/public', publicRouter);

  app.use('/api/job-seekers', requireAuth, jobSeekersRouter);
  app.use('/api/opportunities', requireAuth, opportunitiesRouter);
  app.use('/api/matches', requireAuth, matchesRouter);

  app.use('/api', notFoundHandler);

  const clientDist = env.CLIENT_DIST_DIR || path.join(__dirname, '..', '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();

    const indexPath = path.join(clientDist, 'index.html');

    // /login gets its own title/icon/OG tags baked into the raw HTML so
    // link previews (which never run client JS) show the right thing —
    // see renderHtml.js for why this can't be done client-side alone.
    if (req.path === '/login') {
      fs.readFile(indexPath, 'utf8', (err, html) => {
        if (err) return next(err);
        res.set('Content-Type', 'text/html');
        res.send(renderLoginHtml(html));
      });
      return;
    }

    res.sendFile(indexPath, (err) => {
      if (err) next(err);
    });
  });

  app.use(errorHandler);

  return app;
}
