#!/bin/bash

# Скрипт для тестирования планировщика запланированных заявок

echo "📋 Проверка запланированных заявок в БД..."
docker compose exec postgres psql -U beton_user -d beton_crm -c "
SELECT
    id,
    form_id,
    scheduled_date,
    scheduled_time,
    status,
    created_at
FROM scheduled_submissions
ORDER BY created_at DESC
LIMIT 10;
"

echo ""
echo "📊 Статистика по статусам..."
docker compose exec postgres psql -U beton_user -d beton_crm -c "
SELECT
    status,
    COUNT(*) as count
FROM scheduled_submissions
GROUP BY status
ORDER BY count DESC;
"

echo ""
echo "✅ Готовые к обработке заявки (сегодня или раньше)..."
docker compose exec postgres psql -U beton_user -d beton_crm -c "
SELECT
    id,
    scheduled_date,
    scheduled_time,
    status,
    created_at
FROM scheduled_submissions
WHERE status = 'pending'
    AND scheduled_date <= CURRENT_DATE
ORDER BY scheduled_date, scheduled_time;
"
