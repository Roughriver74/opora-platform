#!/bin/bash

echo "🧪 Тестирование исправления поля 'Время АБН(дата/время)'"
echo ""
echo "📋 Инструкция:"
echo "1. Откройте http://localhost:3000 в браузере"
echo "2. Создайте периодическую заявку с:"
echo "   - Любым названием (например 'ТЕСТ_АБН_$(date +%H%M%S)')"
echo "   - Диапазоном дат: 2-3 дня"
echo "   - Временем отгрузки: любое"
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

# Создаем SQL запрос для проверки formData
docker exec -e PGPASSWORD=postgres beton_postgres psql -U postgres -d beton_crm -x << EOF
SELECT
    submission_number,
    title,
    bitrix_deal_id,
    form_data->'field_1750311670121' as "Поле Время АБН (field_1750311670121)",
    form_data->'field_1750311865385' as "Поле Дата отгрузки (field_1750311865385)",
    created_at
FROM submissions
WHERE bitrix_deal_id = '$BITRIX_ID';
EOF

echo ""
echo "📊 Ожидаемый результат:"
echo "  ✅ Поле Время АБН (field_1750311670121): должно быть ПУСТЫМ (null) или не существовать"
echo "  ✅ Поле Дата отгрузки (field_1750311865385): должно содержать дату периода"
echo ""
echo "❌ Если 'Время АБН' заполнено - исправление НЕ работает"
echo "✅ Если 'Время АБН' пустое - исправление работает!"
