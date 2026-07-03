import { createApp } from './app.js';
import { env } from './env.js';
import { runMigrations } from './db/migrate.js';

async function main() {
  await runMigrations();
  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`[server] listening on port ${env.PORT}`);
  });
}

main().catch((err) => {
  console.error('[server] failed to start', err);
  process.exit(1);
});
