import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { pool } from '../db/pool.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { parseJobSeekerPayload, parseOpportunityPayload } from '../lib/payloads.js';
import { recomputeMatchesForJobSeeker, recomputeMatchesForOpportunity } from '../services/matchService.js';
import { resumeUpload, assertValidResumeContents } from '../lib/upload.js';
import { uploadResume } from '../lib/storage.js';
import { resolveCoordinates } from '../lib/geocode.js';

export const publicRouter = Router();

// These endpoints are unauthenticated by design — they're the two links
// sent to job seekers and employers who don't have the shared login.
// Keep them locked down with a rate limit and a honeypot field.
const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

function rejectBots(req) {
  if (req.body && req.body.website) {
    // honeypot field — real users never fill this in
    throw new ApiError(400, 'Submission rejected');
  }
}

const jobsBoardLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

// Public "browse open roles" board — deliberately only returns fields
// that describe the role itself, never the employer's contact info.
publicRouter.get(
  '/jobs',
  jobsBoardLimiter,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT id, title, company, position_type, required_skills, min_experience_years, location,
              salary_min, salary_max, notes, created_at
       FROM opportunities
       WHERE status = 'open' AND deleted_at IS NULL
       ORDER BY created_at DESC`
    );
    res.json(rows);
  })
);

// Single job detail — used when the "Apply" link on a specific job board
// listing is opened directly (e.g. shared or bookmarked) rather than
// navigated to from the board, where the client already has the data.
publicRouter.get(
  '/jobs/:id',
  jobsBoardLimiter,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT id, title, company, position_type, required_skills, min_experience_years, location,
              salary_min, salary_max, notes, created_at
       FROM opportunities
       WHERE id = $1 AND status = 'open' AND deleted_at IS NULL`,
      [req.params.id]
    );
    if (!rows[0]) throw new ApiError(404, 'Job not found');
    res.json(rows[0]);
  })
);

const SEEKER_INSERT_COLUMNS = [
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

// Job seeker self-intake: the "apply" link.
publicRouter.post(
  '/job-seekers',
  submissionLimiter,
  resumeUpload.single('resume'),
  asyncHandler(async (req, res) => {
    rejectBots(req);

    let notes = req.body.notes || '';
    if (req.body.applied_opportunity_id) {
      const { rows } = await pool.query(
        `SELECT title FROM opportunities WHERE id = $1 AND status = 'open' AND deleted_at IS NULL`,
        [req.body.applied_opportunity_id]
      );
      if (rows[0]) {
        notes = `Applied directly for: ${rows[0].title}\n\n${notes}`.trim();
      }
    }

    const payload = parseJobSeekerPayload(
      {
        ...req.body,
        notes,
        source: req.body.source || 'self_apply',
        skills: parseMaybeJsonArray(req.body.skills),
      },
      { allowPipelineStatus: false }
    );
    const { latitude, longitude } = await resolveCoordinates(payload.location, null);
    payload.latitude = latitude;
    payload.longitude = longitude;

    let resumeFields = { resume_file_url: null, resume_file_name: null, resume_storage_key: null };
    if (req.file) {
      await assertValidResumeContents(req.file.buffer, req.file.originalname);
      const { url, key } = await uploadResume(req.file.buffer, req.file.originalname, req.file.mimetype);
      resumeFields = { resume_file_url: url, resume_file_name: req.file.originalname, resume_storage_key: key };
    }

    const columns = [...SEEKER_INSERT_COLUMNS, 'resume_file_url', 'resume_file_name', 'resume_storage_key'];
    const values = [...SEEKER_INSERT_COLUMNS.map((c) => payload[c]), resumeFields.resume_file_url, resumeFields.resume_file_name, resumeFields.resume_storage_key];
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

    const { rows } = await pool.query(
      `INSERT INTO job_seekers (${columns.join(', ')}) VALUES (${placeholders}) RETURNING id`,
      values
    );
    await recomputeMatchesForJobSeeker(rows[0].id);
    res.status(201).json({ received: true });
  })
);

const OPPORTUNITY_INSERT_COLUMNS = [
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

// Employer opportunity intake: the "post a role" link.
publicRouter.post(
  '/opportunities',
  submissionLimiter,
  asyncHandler(async (req, res) => {
    rejectBots(req);
    const payload = parseOpportunityPayload(
      { ...req.body, required_skills: parseMaybeJsonArray(req.body.required_skills) },
      { allowStatus: false }
    );
    const { latitude, longitude } = await resolveCoordinates(payload.location, null);
    payload.latitude = latitude;
    payload.longitude = longitude;
    const values = OPPORTUNITY_INSERT_COLUMNS.map((c) => payload[c]);
    const placeholders = OPPORTUNITY_INSERT_COLUMNS.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await pool.query(
      `INSERT INTO opportunities (${OPPORTUNITY_INSERT_COLUMNS.join(', ')}) VALUES (${placeholders}) RETURNING id`,
      values
    );
    await recomputeMatchesForOpportunity(rows[0].id);
    res.status(201).json({ received: true });
  })
);

function parseMaybeJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim().startsWith('[')) {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map((s) => s.trim());
  }
  return [];
}
