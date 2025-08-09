-- Создание таблицы submission_history
CREATE TABLE IF NOT EXISTS submission_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL,
    user_id UUID,
    action VARCHAR(50) NOT NULL,
    changes JSONB,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Создание таблицы admin_tokens
CREATE TABLE IF NOT EXISTS admin_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(500) NOT NULL UNIQUE,
    user_id UUID,
    purpose VARCHAR(100),
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_submission_history_submission ON submission_history(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_history_user ON submission_history(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_tokens_token ON admin_tokens(token);
CREATE INDEX IF NOT EXISTS idx_admin_tokens_user ON admin_tokens(user_id);

-- Триггеры для updated_at
CREATE TRIGGER update_submission_history_updated_at BEFORE UPDATE
    ON submission_history FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_tokens_updated_at BEFORE UPDATE
    ON admin_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();