CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE job_seekers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  target_role text,
  skills text[] NOT NULL DEFAULT '{}',
  experience_years numeric,
  location text,
  open_to_relocation boolean NOT NULL DEFAULT false,
  desired_salary numeric,
  email text,
  phone text,
  source text,
  pipeline_status text NOT NULL DEFAULT 'new'
    CHECK (pipeline_status IN ('new', 'screening', 'interviewing', 'offered', 'placed', 'archived')),
  notes text,
  resume_file_url text,
  resume_file_name text,
  resume_storage_key text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT job_seekers_experience_nonnegative CHECK (experience_years IS NULL OR experience_years >= 0),
  CONSTRAINT job_seekers_salary_nonnegative CHECK (desired_salary IS NULL OR desired_salary >= 0)
);

CREATE TABLE opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  department text,
  required_skills text[] NOT NULL DEFAULT '{}',
  min_experience_years numeric,
  location text,
  salary_min numeric,
  salary_max numeric,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'filled', 'closed')),
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT opportunities_min_experience_nonnegative CHECK (min_experience_years IS NULL OR min_experience_years >= 0),
  CONSTRAINT opportunities_salary_min_nonnegative CHECK (salary_min IS NULL OR salary_min >= 0),
  CONSTRAINT opportunities_salary_max_nonnegative CHECK (salary_max IS NULL OR salary_max >= 0)
);

CREATE TABLE matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_seeker_id uuid NOT NULL REFERENCES job_seekers(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  score integer NOT NULL,
  score_breakdown jsonb NOT NULL,
  status text NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'approved', 'rejected')),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_seeker_id, opportunity_id)
);

CREATE INDEX idx_job_seekers_pipeline_status ON job_seekers (pipeline_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_job_seekers_deleted_at ON job_seekers (deleted_at);
CREATE INDEX idx_opportunities_status ON opportunities (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_opportunities_deleted_at ON opportunities (deleted_at);
CREATE INDEX idx_matches_job_seeker ON matches (job_seeker_id);
CREATE INDEX idx_matches_opportunity ON matches (opportunity_id);
CREATE INDEX idx_matches_status ON matches (status);
