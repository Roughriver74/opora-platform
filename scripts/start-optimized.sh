#!/bin/bash

echo "🚀 Оптимизированная сборка и запуск Beton CRM..."

# Остановка существующих контейнеров
echo "🛑 Остановка существующих контейнеров..."
docker compose down

# Проверим размеры директорий перед сборкой
echo "📊 Проверка размеров директорий..."
echo "Frontend node_modules:"
du -sh client/node_modules 2>/dev/null || echo "не существует"
echo "Backend node_modules:" 
du -sh server/node_modules 2>/dev/null || echo "не существует"

# Создаем .dockerignore файлы если их нет
echo "📝 Создание .dockerignore файлов..."

# .dockerignore для клиента (frontend)
cat > client/.dockerignore << EOF
node_modules
build
.git
*.log
npm-debug.log*
.env.local
.env.development.local
.env.test.local
.env.production.local
.DS_Store
coverage
*.tgz
*.tar.gz
EOF

# .dockerignore для сервера (backend)  
cat > server/.dockerignore << EOF
node_modules
dist
.git
*.log
npm-debug.log*
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.DS_Store
coverage
*.tgz
*.tar.gz
EOF

# Сборка только backend (он легче)
echo "🏗️ Сборка backend..."
docker compose build backend

# Сборка frontend (тяжелее, но с кешем backend уже готов)
echo "🏗️ Сборка frontend..."
docker compose build frontend

# Запуск контейнеров
echo "🚀 Запуск контейнеров..."
docker compose up -d

# Ожидание готовности
echo "⏳ Ожидание готовности сервисов..."
sleep 10

# Проверка статуса
if docker compose ps | grep -q "Up"; then
    echo "✅ Beton CRM успешно запущен!"
    echo ""
    echo "🌐 Доступные сервисы:"
    echo "  - Frontend: http://localhost:3000"
    echo "  - Backend API: http://localhost:5001"
    echo ""
    echo "📋 Полезные команды:"
    echo "  - Логи: docker compose logs -f"
    echo "  - Остановка: docker compose down"
    echo "  - Перезапуск: docker compose restart"
    echo ""
    echo "🔍 Проверка health endpoint:"
    sleep 2
    curl -s http://localhost:5001/health | head -1 || echo "Backend еще запускается..."
else
    echo "❌ Ошибка запуска. Проверьте логи: docker compose logs"
    exit 1
fi