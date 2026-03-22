#!/bin/bash

echo "🔍 Проверка поля field_1750311670121"
echo ""

# Получаем токен
echo "🔐 Получение токена..."
TOKEN=$(curl -s -X POST http://localhost:4201/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"crm@betonexpress.pro","password":"admin123"}' | jq -r '.accessToken')

if [ -z "$TOKEN" ]; then
    echo "❌ Не удалось получить токен"
    exit 1
fi

echo "✅ Токен получен"
echo ""

# Получаем список форм
echo "📋 Получение списка форм..."
FORMS=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4201/api/forms)
echo "$FORMS" | jq -r '.[] | "\(.id) - \(.name)"' | head -5
echo ""

# Получаем первую форму
FORM_ID=$(echo "$FORMS" | jq -r '.[0].id')
echo "📝 Получение полей формы $FORM_ID..."
echo ""

# Получаем поля формы
FIELDS=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4201/api/forms/${FORM_ID}/fields)

# Ищем поле field_1750311670121
echo "🔍 Поиск поля field_1750311670121:"
echo "$FIELDS" | jq '.[] | select(.name == "field_1750311670121") | {name: .name, label: .label, fieldType: .fieldType, bitrixFieldId: .bitrixFieldId, required: .required}'
echo ""

# Показываем все поля даты/времени
echo "📅 Все поля даты/времени в форме:"
echo "$FIELDS" | jq '.[] | select(.fieldType == "date" or .fieldType == "datetime" or .fieldType == "time") | {name: .name, label: .label, fieldType: .fieldType, bitrixFieldId: .bitrixFieldId}'
