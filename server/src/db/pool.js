import pg from 'pg';
import { env } from '../env.js';

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('[db] unexpected error on idle client', err);
});
