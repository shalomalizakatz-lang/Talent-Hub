ALTER TABLE job_seekers
  ADD COLUMN latitude numeric,
  ADD COLUMN longitude numeric;

ALTER TABLE opportunities
  ADD COLUMN latitude numeric,
  ADD COLUMN longitude numeric;
