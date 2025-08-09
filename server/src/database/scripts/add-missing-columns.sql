-- Добавление недостающих колонок в таблицу submissions
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS day_of_week SMALLINT,
ADD COLUMN IF NOT EXISTS month_of_year SMALLINT,
ADD COLUMN IF NOT EXISTS year_created INT,
ADD COLUMN IF NOT EXISTS processing_time_minutes INT,
ADD COLUMN IF NOT EXISTS data JSONB;

-- Добавление индексов
CREATE INDEX IF NOT EXISTS idx_submissions_status_created ON submissions(status, created_at);
CREATE INDEX IF NOT EXISTS idx_submissions_assigned_to_name ON submissions(assigned_to_name, status);