#!/bin/bash

# Скрипт для просмотра логов

if [ "$1" == "backend" ]; then
    docker compose logs -f backend
elif [ "$1" == "frontend" ]; then
    docker compose logs -f frontend
elif [ "$1" == "db" ] || [ "$1" == "postgres" ]; then
    docker compose logs -f postgres
elif [ "$1" == "redis" ]; then
    docker compose logs -f redis
else
    echo "📋 Просмотр логов всех сервисов..."
    echo "Для просмотра логов конкретного сервиса используйте:"
    echo "  ./logs.sh backend   - логи backend"
    echo "  ./logs.sh frontend  - логи frontend"
    echo "  ./logs.sh db        - логи PostgreSQL"
    echo "  ./logs.sh redis     - логи Redis"
    echo ""
    docker compose logs -f
fi