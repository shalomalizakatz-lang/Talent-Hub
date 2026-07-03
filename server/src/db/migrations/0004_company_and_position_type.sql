ALTER TABLE opportunities
  RENAME COLUMN department TO company;

ALTER TABLE opportunities
  ADD COLUMN position_type text;
