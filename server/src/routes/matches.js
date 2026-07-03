import { Router } from 'express';
import { pool } from '../db/pool.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { recomputeMatchesForJobSeeker } from '../services/matchService.js';

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
    const decidedAt = status === 'suggested' ? null : new Date();
    const { rows } = await pool.query(
      `UPDATE matches SET status = $1, decided_at = $2 WHERE id = $3 RETURNING *`,
      [status, decidedAt, req.params.id]
    );
    if (!rows[0]) throw new ApiError(404, 'Match not found');
    res.json(rows[0]);
  })
);

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
