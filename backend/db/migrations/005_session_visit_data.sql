-- Add visit and GPS data to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS visit_number VARCHAR(50) NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS shop_number VARCHAR(50) NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS gps_lat FLOAT NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS gps_lng FLOAT NULL;

CREATE INDEX IF NOT EXISTS sessions_visit_number_idx ON sessions(visit_number);

