ALTER TABLE job_seekers
  ADD COLUMN industry text,
  ADD COLUMN open_to_other_industries boolean NOT NULL DEFAULT false;
