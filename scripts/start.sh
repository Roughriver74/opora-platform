#!/bin/bash

echo "🚀 Запуск Beton CRM с полным обновлением..."

# Остановка существующих контейнеров
echo "🛑 Остановка существующих контейнеров..."
docker compose down

# Удаление старых образов
echo "🗑️ Удаление старых образов..."
docker compose down --rmi local

# Создание .dockerignore файлов для оптимизации
echo "📝 Создание .dockerignore файлов..."

# .dockerignore для клиента (frontend)
# ВАЖНО: не игнорируем build, т.к. он копируется в образ nginx
cat > client/.dockerignore << 'EOF'
node_modules
.git
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.env.local
.env.development.local
.env.test.local
.env.production.local
.DS_Store
.vscode
.idea
coverage
*.tgz
*.tar.gz
.nyc_output
EOF

# .dockerignore для сервера (backend)  
cat > server/.dockerignore << 'EOF'
node_modules
dist
.git
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.DS_Store
.vscode
.idea
coverage
*.tgz
*.tar.gz
.nyc_output
EOF

# Проверка свободного места на диске
echo "💾 Проверка свободного места на диске..."
AVAILABLE_SPACE=$(df / | awk 'NR==2 {print $4}')
if [ "$AVAILABLE_SPACE" -lt 2000000 ]; then
    echo "⚠️  Мало свободного места на диске. Очищаем Docker кеш..."
    docker system prune -a -f --volumes
fi

# Локальная сборка фронтенда (для образа nginx)
echo "🧱 Сборка frontend локально..."
pushd client >/dev/null
npm ci --silent
npm run build --silent
popd >/dev/null

echo "📦 Сборка backend и упаковка образов внутри Docker..."

# Пересборка без кеша (сначала backend, потом frontend)
echo "🏗️ Пересборка backend без кеша..."
docker compose build --no-cache backend

echo "🏗️ Пересборка frontend без кеша..."
docker compose build --no-cache frontend

# Запуск обновленных контейнеров
echo "🚀 Запуск обновленных контейнеров..."
docker compose up -d

# Ожидание готовности сервисов
echo "⏳ Ожидание готовности сервисов..."
sleep 15

# Проверка статуса контейнеров
echo "🔍 Проверка статуса контейнеров..."
docker compose ps

# Проверка работоспособности API
echo "🔍 Проверка health endpoint..."
sleep 3
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/health 2>/dev/null || echo "000")

if [ "$HEALTH_CHECK" = "200" ]; then
    echo "✅ Backend API работает корректно"
elif [ "$HEALTH_CHECK" = "000" ]; then
    echo "⚠️  Backend еще запускается..."
    sleep 5
    HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/health 2>/dev/null || echo "000")
    if [ "$HEALTH_CHECK" = "200" ]; then
        echo "✅ Backend API теперь работает корректно"
    fi
fi

# Финальная проверка статуса
if docker compose ps | grep -q "Up"; then
    echo ""
    echo "✅ Beton CRM успешно запущен!"
    echo ""
    echo "🌐 Доступные сервисы:"
    echo "  - Frontend: http://localhost:3000"
    echo "  - Backend API: http://localhost:5001"
    echo "  - PostgreSQL: localhost:5489"
    echo "  - Redis: localhost:6396"
    echo ""
    echo "📋 Полезные команды:"
    echo "  - Логи: docker compose logs -f"
    echo "  - Логи backend: docker compose logs -f backend"
    echo "  - Логи frontend: docker compose logs -f frontend"
    echo "  - Остановка: docker compose down"
    echo "  - Перезапуск: docker compose restart"
    echo ""
    echo "🔧 Health check:"
    curl -s http://localhost:5001/health 2>/dev/null && echo "" || echo "Backend еще запускается..."
else
    echo "❌ Ошибка запуска. Проверьте логи: docker compose logs"
    echo ""
    echo "📋 Диагностические команды:"
    echo "  - docker compose logs backend"
    echo "  - docker compose logs frontend"
    echo "  - docker compose ps"
    exit 1
fi