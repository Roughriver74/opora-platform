-- Инициализация базы данных Beton CRM
-- Этот скрипт выполняется автоматически при первом запуске PostgreSQL контейнера

-- Создание расширений
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Для полнотекстового поиска

-- Создание схемы
CREATE SCHEMA IF NOT EXISTS beton;

-- Установка пути поиска
SET search_path TO beton, public;

-- Создание функции для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создание таблицы пользователей
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    bitrix_id VARCHAR(100),
    bitrix_user_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{"onlyMyCompanies": false}'::jsonb,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для users
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_bitrix_user_id ON users(bitrix_user_id);
CREATE INDEX idx_users_email_lower ON users(LOWER(email));

-- Триггер для обновления updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Создание таблицы форм
CREATE TABLE IF NOT EXISTS forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    bitrix_deal_category VARCHAR(100),
    success_message TEXT DEFAULT 'Спасибо! Ваша заявка успешно отправлена.',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для forms
CREATE INDEX idx_forms_is_active ON forms(is_active);

-- Триггер для обновления updated_at
CREATE TRIGGER update_forms_updated_at BEFORE UPDATE ON forms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Создание таблицы полей форм
CREATE TABLE IF NOT EXISTS form_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
    section_id VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    label VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    required BOOLEAN DEFAULT false,
    placeholder VARCHAR(255),
    bitrix_field_id VARCHAR(100),
    bitrix_field_type VARCHAR(100),
    bitrix_entity VARCHAR(50),
    options JSONB,
    dynamic_source JSONB,
    linked_fields JSONB,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для form_fields
CREATE INDEX idx_form_fields_form_order ON form_fields(form_id, order_index);
CREATE INDEX idx_form_fields_form_section_order ON form_fields(form_id, section_id, order_index);
CREATE INDEX idx_form_fields_name_form ON form_fields(name, form_id);
CREATE INDEX idx_form_fields_type ON form_fields(type);
CREATE INDEX idx_form_fields_dynamic_source ON form_fields((dynamic_source->>'enabled'), (dynamic_source->>'source'));
CREATE INDEX idx_form_fields_linked_fields ON form_fields((linked_fields->>'enabled'));

-- Триггер для обновления updated_at
CREATE TRIGGER update_form_fields_updated_at BEFORE UPDATE ON form_fields
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Создание таблицы заявок
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_number VARCHAR(50) UNIQUE NOT NULL,
    form_id UUID REFERENCES forms(id),
    user_id UUID REFERENCES users(id),
    assigned_to_id UUID REFERENCES users(id),
    title VARCHAR(500) NOT NULL,
    status VARCHAR(50) DEFAULT 'NEW',
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    bitrix_deal_id VARCHAR(100),
    bitrix_category_id VARCHAR(100),
    bitrix_sync_status VARCHAR(20) DEFAULT 'pending' CHECK (bitrix_sync_status IN ('pending', 'synced', 'failed')),
    bitrix_sync_error TEXT,
    notes TEXT,
    tags TEXT[],
    -- Денормализованные данные для производительности
    form_name VARCHAR(255),
    form_title VARCHAR(255),
    user_email VARCHAR(255),
    user_name VARCHAR(255),
    assigned_to_name VARCHAR(255),
    -- Предвычисленные поля
    day_of_week SMALLINT CHECK (day_of_week >= 0 AND day_of_week <= 6),
    month_of_year SMALLINT CHECK (month_of_year >= 1 AND month_of_year <= 12),
    year_created INTEGER,
    processing_time_minutes INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для submissions
CREATE INDEX idx_submissions_status_created ON submissions(status, created_at DESC);
CREATE INDEX idx_submissions_user_status ON submissions(user_id, status, created_at DESC);
CREATE INDEX idx_submissions_assigned ON submissions(assigned_to_id, status, created_at DESC);
CREATE INDEX idx_submissions_form_created ON submissions(form_id, created_at DESC);
CREATE INDEX idx_submissions_bitrix_sync ON submissions(bitrix_sync_status, created_at DESC);
CREATE INDEX idx_submissions_priority_status ON submissions(priority, status);
CREATE INDEX idx_submissions_tags ON submissions USING GIN(tags);
CREATE INDEX idx_submissions_user_email ON submissions(user_email, status);
CREATE INDEX idx_submissions_form_name ON submissions(form_name, created_at DESC);
CREATE INDEX idx_submissions_year_month ON submissions(year_created, month_of_year);
CREATE INDEX idx_submissions_assigned_name ON submissions(assigned_to_name, status);

-- Триггер для обновления updated_at
CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Создание таблицы истории заявок
CREATE TABLE IF NOT EXISTS submission_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('create', 'update', 'status_change', 'assign', 'comment', 'sync_bitrix', 'delete')),
    description TEXT NOT NULL,
    changes JSONB,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для submission_history
CREATE INDEX idx_submission_history_submission ON submission_history(submission_id, created_at);
CREATE INDEX idx_submission_history_user ON submission_history(user_id, created_at);
CREATE INDEX idx_submission_history_action ON submission_history(action_type, created_at);

-- Создание таблицы токенов администратора
CREATE TABLE IF NOT EXISTS admin_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для admin_tokens
CREATE INDEX idx_admin_tokens_user ON admin_tokens(user_id);
CREATE INDEX idx_admin_tokens_active_expires ON admin_tokens(is_active, expires_at);

-- Создание таблицы настроек
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    category VARCHAR(50) DEFAULT 'system' CHECK (category IN ('system', 'bitrix', 'email', 'notification', 'security', 'ui')),
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    is_encrypted BOOLEAN DEFAULT false,
    validation JSONB,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для settings
CREATE INDEX idx_settings_category ON settings(category);

-- Триггер для обновления updated_at
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Создание представления для статистики заявок
CREATE OR REPLACE VIEW submission_statistics AS
SELECT 
    COUNT(*) as total_submissions,
    COUNT(CASE WHEN status = 'NEW' THEN 1 END) as new_submissions,
    COUNT(CASE WHEN status IN ('WON', 'COMPLETED') THEN 1 END) as completed_submissions,
    COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as today_submissions,
    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as week_submissions,
    COUNT(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as month_submissions,
    AVG(processing_time_minutes) as avg_processing_time
FROM submissions;

-- Создание функции для генерации номера заявки
CREATE OR REPLACE FUNCTION generate_submission_number()
RETURNS VARCHAR AS $$
DECLARE
    new_number VARCHAR;
BEGIN
    new_number := TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Вставка начальных данных
-- Создание администратора по умолчанию (пароль: admin123)
INSERT INTO users (email, password, first_name, last_name, role, is_active)
VALUES ('admin@beton.local', '$2b$10$YourHashedPasswordHere', 'Admin', 'User', 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- Создание начальных настроек
INSERT INTO settings (key, value, category, description, is_public)
VALUES 
    ('app.name', '"Beton CRM"', 'system', 'Название приложения', true),
    ('app.version', '"1.0.0"', 'system', 'Версия приложения', true),
    ('maintenance.mode', 'false', 'system', 'Режим обслуживания', false)
ON CONFLICT (key) DO NOTHING;

-- Предоставление прав
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA beton TO beton_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA beton TO beton_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA beton TO beton_user;