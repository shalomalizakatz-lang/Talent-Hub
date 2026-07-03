import { Router } from 'express';
import { pool } from '../db/pool.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { parseOpportunityPayload, OPPORTUNITY_STATUSES } from '../lib/payloads.js';
import { recomputeMatchesForOpportunity } from '../services/matchService.js';
import { resolveCoordinates } from '../lib/geocode.js';

export const opportunitiesRouter = Router();

const INSERT_COLUMNS = [
  'title',
  'company',
  'position_type',
  'required_skills',
  'min_experience_years',
  'location',
  'salary_min',
  'salary_max',
  'status',
  'notes',
  'contact_name',
  'contact_email',
  'contact_phone',
  'latitude',
  'longitude',
];

opportunitiesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status } = req.query;
    const clauses = ['deleted_at IS NULL'];
    const params = [];
    if (status) {
      if (!OPPORTUNITY_STATUSES.includes(status)) {
        throw new ApiError(400, 'Invalid status filter');
      }
      params.push(status);
      clauses.push(`status = $${params.length}`);
    }
    const { rows } = await pool.query(
      `SELECT * FROM opportunities WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC`,
      params
    );
    res.json(rows);
  })
);

opportunitiesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM opportunities WHERE id = $1', [req.params.id]);
    const opportunity = rows[0];
    if (!opportunity) throw new ApiError(404, 'Opportunity not found');

    const { rows: matches } = await pool.query(
      `SELECT m.*, js.name AS job_seeker_name, js.pipeline_status AS job_seeker_pipeline_status
       FROM matches m JOIN job_seekers js ON js.id = m.job_seeker_id
       WHERE m.opportunity_id = $1 AND js.deleted_at IS NULL
       ORDER BY m.score DESC`,
      [opportunity.id]
    );
    res.json({ ...opportunity, matches });
  })
);

opportunitiesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = parseOpportunityPayload(req.body);
    const { latitude, longitude } = await resolveCoordinates(payload.location, null);
    const values = INSERT_COLUMNS.map((c) => (c === 'latitude' ? latitude : c === 'longitude' ? longitude : payload[c]));
    const placeholders = INSERT_COLUMNS.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await pool.query(
      `INSERT INTO opportunities (${INSERT_COLUMNS.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    const opportunity = rows[0];
    await recomputeMatchesForOpportunity(opportunity.id);
    res.status(201).json(opportunity);
  })
);

opportunitiesRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await pool.query(
      'SELECT location, latitude, longitude FROM opportunities WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );
    if (!existing.rows[0]) throw new ApiError(404, 'Opportunity not found');

    const payload = parseOpportunityPayload(req.body);
    const { latitude, longitude } = await resolveCoordinates(payload.location, existing.rows[0]);
    const setClause = INSERT_COLUMNS.map((c, i) => `${c} = $${i + 1}`).join(', ');
    const values = INSERT_COLUMNS.map((c) => (c === 'latitude' ? latitude : c === 'longitude' ? longitude : payload[c]));
    const { rows } = await pool.query(
      `UPDATE opportunities SET ${setClause}, updated_at = now() WHERE id = $${
        INSERT_COLUMNS.length + 1
      } RETURNING *`,
      [...values, req.params.id]
    );
    await recomputeMatchesForOpportunity(req.params.id);
    res.json(rows[0]);
  })
);

opportunitiesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      'UPDATE opportunities SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id',
      [req.params.id]
    );
    if (!rows[0]) throw new ApiError(404, 'Opportunity not found');
    res.status(204).end();
  })
);
