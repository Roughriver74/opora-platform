#!/bin/bash

echo "🛑 Остановка Beton CRM..."

# Остановка всех контейнеров
docker compose down

echo "✅ Все контейнеры остановлены"