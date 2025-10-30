#!/bin/bash

echo "🧪 Тестирование исправлений периодических заявок"
echo ""
echo "Этот скрипт поможет проверить:"
echo "1. ✅ Поля периодов (isPeriodSubmission, periodGroupId, etc.) сохраняются в БД"
echo "2. ✅ Название заявки берется из формы, а не генерируется автоматически"
echo ""
echo "📋 Инструкция:"
echo "1. Откройте http://localhost:3000 в браузере"
echo "2. Создайте периодическую заявку с:"
echo "   - Названием: 'ТЕСТ_ПЕРИОД_$(date +%H%M%S)'"
echo "   - Диапазоном дат: 3-4 дня"
echo "   - Временем отгрузки: 12:00"
echo "3. После создания заявок, запомните любой Bitrix ID из уведомления"
echo ""
echo -n "Введите Bitrix ID одной из созданных заявок: "
read BITRIX_ID

if [ -z "$BITRIX_ID" ]; then
    echo "❌ Bitrix ID не введен"
    exit 1
fi

echo ""
echo "🔍 Проверка заявки с Bitrix ID: $BITRIX_ID"
echo ""

# Создаем SQL запрос для проверки
docker compose exec -T postgres psql -U postgres -d beton_crm << EOF
\x
SELECT
    submission_number,
    title,
    bitrix_deal_id,
    is_period_submission,
    period_group_id,
    period_start_date,
    period_end_date,
    created_at,
    form_data->'_periodMetadata' as period_metadata
FROM submissions
WHERE bitrix_deal_id = '$BITRIX_ID';
EOF

echo ""
echo "📊 Ожидаемый результат:"
echo "  - title: должен содержать 'ТЕСТ_ПЕРИОД_' (НЕ 'Заявка от')"
echo "  - is_period_submission: true"
echo "  - period_group_id: UUID (не NULL)"
echo "  - period_start_date: дата начала диапазона"
echo "  - period_end_date: дата окончания диапазона"
echo "  - period_metadata: JSON с periodGroupId, periodPosition, totalInPeriod"
echo ""
echo "✅ Если все поля заполнены корректно - исправления работают!"
echo "❌ Если поля NULL или title = 'Заявка от...' - есть проблема"
