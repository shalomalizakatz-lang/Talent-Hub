import { Router } from 'express';
import { pool } from '../db/pool.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { recomputeMatchesForJobSeeker } from '../services/matchService.js';
import { sendMatchApprovedEmail } from '../lib/email.js';

export const matchesRouter = Router();

matchesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { opportunityId, jobSeekerId, status } = req.query;
    const clauses = ['js.deleted_at IS NULL', 'o.deleted_at IS NULL'];
    const params = [];

    if (opportunityId) {
      params.push(opportunityId);
      clauses.push(`m.opportunity_id = $${params.length}`);
    }
    if (jobSeekerId) {
      params.push(jobSeekerId);
      clauses.push(`m.job_seeker_id = $${params.length}`);
    }
    if (status) {
      if (!['suggested', 'approved', 'rejected'].includes(status)) {
        throw new ApiError(400, 'Invalid status filter');
      }
      params.push(status);
      clauses.push(`m.status = $${params.length}`);
    }

    const { rows } = await pool.query(
      `SELECT m.*,
              js.name AS job_seeker_name, js.pipeline_status AS job_seeker_pipeline_status,
              o.title AS opportunity_title, o.status AS opportunity_status
       FROM matches m
       JOIN job_seekers js ON js.id = m.job_seeker_id
       JOIN opportunities o ON o.id = m.opportunity_id
       WHERE ${clauses.join(' AND ')}
       ORDER BY m.score DESC`,
      params
    );
    res.json(rows);
  })
);

matchesRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { status } = req.body || {};
    if (!['approved', 'rejected', 'suggested'].includes(status)) {
      throw new ApiError(400, 'status must be one of: approved, rejected, suggested');
    }

    const { rows: beforeRows } = await pool.query('SELECT status FROM matches WHERE id = $1', [req.params.id]);
    if (!beforeRows[0]) throw new ApiError(404, 'Match not found');
    const wasApproved = beforeRows[0].status === 'approved';

    const decidedAt = status === 'suggested' ? null : new Date();
    const { rows } = await pool.query(
      `UPDATE matches SET status = $1, decided_at = $2 WHERE id = $3 RETURNING *`,
      [status, decidedAt, req.params.id]
    );
    const match = rows[0];
    res.json(match);

    // Fire the employer notification after responding — a slow/failed email
    // provider shouldn't hold up or fail the approve action itself.
    if (status === 'approved' && !wasApproved) {
      notifyEmployerOfApprovedMatch(match).catch((err) => {
        console.error('[matches] failed to send approval notification', err);
      });
    }
  })
);

async function notifyEmployerOfApprovedMatch(match) {
  const { rows } = await pool.query(
    `SELECT
       o.title AS opportunity_title, o.contact_email, o.contact_name,
       js.name AS seeker_name, js.target_role AS seeker_target_role,
       js.skills AS seeker_skills, js.experience_years AS seeker_experience_years,
       js.resume_file_url
     FROM matches m
     JOIN opportunities o ON o.id = m.opportunity_id
     JOIN job_seekers js ON js.id = m.job_seeker_id
     WHERE m.id = $1`,
    [match.id]
  );
  const info = rows[0];
  if (!info || !info.contact_email) return;

  await sendMatchApprovedEmail({
    to: info.contact_email,
    contactName: info.contact_name,
    opportunityTitle: info.opportunity_title,
    seekerName: info.seeker_name,
    seekerTargetRole: info.seeker_target_role,
    seekerSkills: info.seeker_skills,
    seekerExperienceYears: info.seeker_experience_years,
    score: match.score,
    resumeUrl: info.resume_file_url,
  });
}

// Manual full recompute — the app also recomputes automatically on every
// job seeker / opportunity create or update, so this is mainly a safety net.
matchesRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { rows: seekers } = await pool.query('SELECT id FROM job_seekers WHERE deleted_at IS NULL');
    for (const seeker of seekers) {
      await recomputeMatchesForJobSeeker(seeker.id);
    }
    res.json({ refreshed: seekers.length });
  })
);
