import { pool } from '../db/pool.js';
import { scoreMatch } from '../lib/matching.js';

const UPSERT_SQL = `
  INSERT INTO matches (job_seeker_id, opportunity_id, score, score_breakdown, status)
  VALUES ($1, $2, $3, $4, 'suggested')
  ON CONFLICT (job_seeker_id, opportunity_id)
  DO UPDATE SET score = EXCLUDED.score, score_breakdown = EXCLUDED.score_breakdown
  WHERE matches.status = 'suggested'
`;

/**
 * Recomputes suggested match scores for one job seeker against every
 * non-deleted opportunity. Matches already approved/rejected are left
 * untouched (their score is frozen at time of decision).
 */
export async function recomputeMatchesForJobSeeker(jobSeekerId) {
  const { rows: seekerRows } = await pool.query(
    'SELECT * FROM job_seekers WHERE id = $1 AND deleted_at IS NULL',
    [jobSeekerId]
  );
  const seeker = seekerRows[0];
  if (!seeker) return;

  const { rows: opportunities } = await pool.query(
    'SELECT * FROM opportunities WHERE deleted_at IS NULL'
  );

  for (const opportunity of opportunities) {
    const { score, breakdown } = scoreMatch(seeker, opportunity);
    await pool.query(UPSERT_SQL, [seeker.id, opportunity.id, score, breakdown]);
  }
}

/**
 * Recomputes suggested match scores for one opportunity against every
 * non-deleted job seeker.
 */
export async function recomputeMatchesForOpportunity(opportunityId) {
  const { rows: oppRows } = await pool.query(
    'SELECT * FROM opportunities WHERE id = $1 AND deleted_at IS NULL',
    [opportunityId]
  );
  const opportunity = oppRows[0];
  if (!opportunity) return;

  const { rows: seekers } = await pool.query(
    'SELECT * FROM job_seekers WHERE deleted_at IS NULL'
  );

  for (const seeker of seekers) {
    const { score, breakdown } = scoreMatch(seeker, opportunity);
    await pool.query(UPSERT_SQL, [seeker.id, opportunity.id, score, breakdown]);
  }
}
