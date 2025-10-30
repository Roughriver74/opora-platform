#!/bin/bash

echo "🧪 Тестирование всех исправлений периодических заявок"
echo ""
echo "📋 Инструкция:"
echo "1. Откройте http://localhost:3000 в браузере"
echo "2. Войдите под своим пользователем (НЕ admin)"
echo "3. Создайте периодическую заявку с:"
echo "   - Названием: 'ТЕСТ_FIXES_$(date +%H%M%S)'"
echo "   - Диапазоном дат: 2-3 дня"
echo "   - Временем отгрузки: любое (например 12:00)"
echo "4. Обратите внимание:"
echo "   - Должно появиться уведомление об успешном создании"
echo "   - Через 6 секунд вас автоматически перенаправит на 'Мои заявки'"
echo "5. После создания заявок, запомните любой Bitrix ID из уведомления"
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

# Получаем данные заявки
docker exec -e PGPASSWORD=postgres beton_postgres psql -U postgres -d beton_crm -x << EOF
SELECT
    submission_number,
    title,
    bitrix_deal_id,
    is_period_submission,
    period_group_id,
    period_start_date,
    period_end_date,
    form_data->'field_1750311670121' as "Поле 'Время АБН' (должно быть ПУСТО)",
    form_data->'field_1750311865385' as "Поле 'Дата отгрузки'",
    form_data->'_periodMetadata' as "Метаданные периода",
    created_at
FROM submissions
WHERE bitrix_deal_id = '$BITRIX_ID';
EOF

echo ""
echo "📊 Проверка результатов:"
echo ""
echo "✅ ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ:"
echo "  1. title: должен содержать 'ТЕСТ_FIXES_' (НЕ 'Заявка от...')"
echo "  2. is_period_submission: true"
echo "  3. period_group_id: UUID (не NULL)"
echo "  4. period_start_date и period_end_date: должны быть заполнены"
echo "  5. Поле 'Время АБН': должно быть ПУСТЫМ (null) ✅✅✅"
echo "  6. Поле 'Дата отгрузки': должно содержать дату из периода"
echo ""
echo "🔍 Проверка ответственного:"
echo ""

# Получаем информацию об ответственном из Bitrix24
TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"crm@betonexpress.pro","password":"admin123"}' | jq -r '.accessToken')

if [ -z "$TOKEN" ]; then
    echo "❌ Не удалось получить токен для проверки Bitrix"
else
    echo "Получаем данные сделки из Bitrix24..."

    # Получаем webhook URL из env файла
    WEBHOOK_URL=$(grep BITRIX24_WEBHOOK_URL /Users/evgenijsikunov/projects/beton-crm/beton-crm/server/.env | cut -d'=' -f2-)

    if [ -n "$WEBHOOK_URL" ]; then
        DEAL_DATA=$(curl -s "${WEBHOOK_URL}crm.deal.get.json?ID=${BITRIX_ID}")
        ASSIGNED_BY=$(echo "$DEAL_DATA" | jq -r '.result.ASSIGNED_BY_ID')

        echo ""
        echo "Ответственный в Bitrix24: $ASSIGNED_BY"
        echo ""
        echo "✅ Должен быть: ID создателя заявки (НЕ '1' - Евгений Шикунов)"
        echo ""
    fi
fi

echo ""
echo "🎯 ИТОГОВАЯ ПРОВЕРКА:"
echo "  ✅ Если все поля заполнены корректно - все исправления работают!"
echo "  ✅ Если 'Время АБН' пустое - исправление поля работает!"
echo "  ✅ Если ответственный = создатель - исправление ответственного работает!"
echo "  ✅ Если редирект через 6 сек - исправление задержки работает!"
