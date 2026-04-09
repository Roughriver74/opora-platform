-- Добавляем столбец is_date_field в таблицу field_mappings
ALTER TABLE field_mappings ADD COLUMN is_date_field BOOLEAN DEFAULT FALSE;

-- Обновляем поля типа datetime, чтобы они синхронизировались с основным полем date
UPDATE field_mappings
SET is_date_field = TRUE
WHERE entity_type = 'visit' AND field_type = 'datetime';

-- Если есть конкретное поле, которое должно быть основным для даты, можно указать его здесь
-- UPDATE field_mappings
-- SET is_date_field = TRUE
-- WHERE entity_type = 'visit' AND app_field_name = 'visit_date';
