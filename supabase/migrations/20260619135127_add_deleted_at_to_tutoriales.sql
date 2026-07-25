ALTER TABLE tutoriales ADD COLUMN deleted_at timestamptz DEFAULT NULL;
CREATE INDEX idx_tutoriales_deleted_at ON tutoriales (deleted_at) WHERE deleted_at IS NOT NULL;
