import { Router } from 'express';
import { pool } from '../db/pool.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { parseJobSeekerPayload, PIPELINE_STATUSES } from '../lib/payloads.js';
import { recomputeMatchesForJobSeeker } from '../services/matchService.js';
import { resumeUpload, assertValidResumeContents } from '../lib/upload.js';
import { uploadResume, deleteResume } from '../lib/storage.js';
import { resolveCoordinates } from '../lib/geocode.js';

export const jobSeekersRouter = Router();

const INSERT_COLUMNS = [
  'name',
  'target_role',
  'skills',
  'experience_years',
  'location',
  'open_to_relocation',
  'desired_salary',
  'email',
  'phone',
  'source',
  'pipeline_status',
  'notes',
  'latitude',
  'longitude',
];

jobSeekersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { search, pipelineStatus } = req.query;
    const clauses = ['deleted_at IS NULL'];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      clauses.push(`(name ILIKE $${params.length} OR EXISTS (
        SELECT 1 FROM unnest(skills) s WHERE s ILIKE $${params.length}
      ))`);
    }
    if (pipelineStatus) {
      if (!PIPELINE_STATUSES.includes(pipelineStatus)) {
        throw new ApiError(400, 'Invalid pipelineStatus filter');
      }
      params.push(pipelineStatus);
      clauses.push(`pipeline_status = $${params.length}`);
    }

    const { rows } = await pool.query(
      `SELECT * FROM job_seekers WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC`,
      params
    );
    res.json(rows);
  })
);

jobSeekersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM job_seekers WHERE id = $1', [req.params.id]);
    const seeker = rows[0];
    if (!seeker) throw new ApiError(404, 'Job seeker not found');

    const { rows: matches } = await pool.query(
      `SELECT m.*, o.title AS opportunity_title, o.status AS opportunity_status, o.location AS opportunity_location
       FROM matches m JOIN opportunities o ON o.id = m.opportunity_id
       WHERE m.job_seeker_id = $1 AND o.deleted_at IS NULL
       ORDER BY m.score DESC`,
      [seeker.id]
    );
    res.json({ ...seeker, matches });
  })
);

jobSeekersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = parseJobSeekerPayload(req.body);
    const { latitude, longitude } = await resolveCoordinates(payload.location, null);
    const values = INSERT_COLUMNS.map((c) => (c === 'latitude' ? latitude : c === 'longitude' ? longitude : payload[c]));
    const placeholders = INSERT_COLUMNS.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await pool.query(
      `INSERT INTO job_seekers (${INSERT_COLUMNS.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    const seeker = rows[0];
    await recomputeMatchesForJobSeeker(seeker.id);
    res.status(201).json(seeker);
  })
);

jobSeekersRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await pool.query(
      'SELECT location, latitude, longitude FROM job_seekers WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );
    if (!existing.rows[0]) throw new ApiError(404, 'Job seeker not found');

    const payload = parseJobSeekerPayload(req.body);
    const { latitude, longitude } = await resolveCoordinates(payload.location, existing.rows[0]);
    const setClause = INSERT_COLUMNS.map((c, i) => `${c} = $${i + 1}`).join(', ');
    const values = INSERT_COLUMNS.map((c) => (c === 'latitude' ? latitude : c === 'longitude' ? longitude : payload[c]));
    const { rows } = await pool.query(
      `UPDATE job_seekers SET ${setClause}, updated_at = now() WHERE id = $${
        INSERT_COLUMNS.length + 1
      } RETURNING *`,
      [...values, req.params.id]
    );
    await recomputeMatchesForJobSeeker(req.params.id);
    res.json(rows[0]);
  })
);

jobSeekersRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      'UPDATE job_seekers SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id',
      [req.params.id]
    );
    if (!rows[0]) throw new ApiError(404, 'Job seeker not found');
    res.status(204).end();
  })
);

jobSeekersRouter.post(
  '/:id/resume',
  resumeUpload.single('resume'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, 'No resume file provided');
    const { rows } = await pool.query('SELECT * FROM job_seekers WHERE id = $1 AND deleted_at IS NULL', [
      req.params.id,
    ]);
    const seeker = rows[0];
    if (!seeker) throw new ApiError(404, 'Job seeker not found');

    await assertValidResumeContents(req.file.buffer, req.file.originalname);
    const { url, key } = await uploadResume(req.file.buffer, req.file.originalname, req.file.mimetype);

    if (seeker.resume_storage_key) {
      await deleteResume(seeker.resume_storage_key).catch(() => {});
    }

    const { rows: updated } = await pool.query(
      `UPDATE job_seekers
       SET resume_file_url = $1, resume_file_name = $2, resume_storage_key = $3, updated_at = now()
       WHERE id = $4 RETURNING *`,
      [url, req.file.originalname, key, seeker.id]
    );
    res.json(updated[0]);
  })
);

jobSeekersRouter.delete(
  '/:id/resume',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM job_seekers WHERE id = $1 AND deleted_at IS NULL', [
      req.params.id,
    ]);
    const seeker = rows[0];
    if (!seeker) throw new ApiError(404, 'Job seeker not found');
    if (seeker.resume_storage_key) {
      await deleteResume(seeker.resume_storage_key).catch(() => {});
    }
    const { rows: updated } = await pool.query(
      `UPDATE job_seekers
       SET resume_file_url = NULL, resume_file_name = NULL, resume_storage_key = NULL, updated_at = now()
       WHERE id = $1 RETURNING *`,
      [seeker.id]
    );
    res.json(updated[0]);
  })
);
