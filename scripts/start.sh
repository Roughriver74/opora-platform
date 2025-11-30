#!/bin/bash

echo "🚀 Запуск Beton CRM с полным обновлением..."

# Остановка существующих контейнеров
echo "🛑 Остановка существующих контейнеров..."
docker compose down

# Принудительное удаление контейнеров с префиксом beton_ (на случай, если они остались)
echo "🧹 Принудительное удаление старых контейнеров beton_*..."
CONTAINERS=$(docker ps -a --filter "name=beton_" --format "{{.Names}}" 2>/dev/null || true)
if [ -n "$CONTAINERS" ]; then
    echo "$CONTAINERS" | xargs docker rm -f 2>/dev/null || true
fi

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

# Инициализация базы данных
echo "🗄️ Инициализация базы данных..."
sleep 5  # Даем время PostgreSQL полностью запуститься

# Проверяем, что PostgreSQL доступен
if docker exec beton_postgres pg_isready -U beton_user -d beton_crm >/dev/null 2>&1; then
    echo "✅ PostgreSQL доступен"
    
    # Проверяем, есть ли таблицы в базе данных
    TABLE_COUNT=$(docker exec -e PGPASSWORD=beton_password_secure_2025 beton_postgres psql -U beton_user -d beton_crm -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name != 'migrations';" 2>/dev/null | xargs || echo "0")
    
    if [ "$TABLE_COUNT" = "0" ]; then
        echo "📋 Создание базовых таблиц..."
        
        # Выполняем SQL скрипт инициализации
        if docker exec -i -e PGPASSWORD=beton_password_secure_2025 beton_postgres psql -U beton_user -d beton_crm < server/src/database/scripts/init-db.sql >/dev/null 2>&1; then
            echo "✅ Базовые таблицы созданы"
            
            # Перемещаем таблицы в схему public (если они создались в beton)
            docker exec -e PGPASSWORD=beton_password_secure_2025 beton_postgres psql -U beton_user -d beton_crm -c "
                DO \$\$
                BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'beton' AND table_name = 'users') THEN
                        ALTER TABLE beton.users SET SCHEMA public;
                        ALTER TABLE beton.forms SET SCHEMA public;
                        ALTER TABLE beton.form_fields SET SCHEMA public;
                        ALTER TABLE beton.submissions SET SCHEMA public;
                        ALTER TABLE beton.submission_history SET SCHEMA public;
                        ALTER TABLE beton.admin_tokens SET SCHEMA public;
                        ALTER TABLE beton.settings SET SCHEMA public;
                    END IF;
                END
                \$\$;
            " >/dev/null 2>&1
            
            echo "✅ Таблицы перемещены в схему public"
        else
            echo "⚠️ Предупреждение: Не удалось создать базовые таблицы"
        fi
    else
        echo "✅ Таблицы уже существуют ($TABLE_COUNT таблиц)"
    fi
    
    # Выполняем миграции TypeORM
    echo "🔄 Выполнение миграций TypeORM..."
    if docker exec beton_backend npm run migration:run:prod >/dev/null 2>&1; then
        echo "✅ Миграции TypeORM выполнены успешно"
    else
        echo "⚠️ Предупреждение: Не удалось выполнить миграции TypeORM"
        echo "   Возможно потребуется запустить их вручную: docker exec beton_backend npm run migration:run:prod"
    fi
else
    echo "⚠️ PostgreSQL недоступен, пропускаем инициализацию БД"
fi

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

# Инкрементальная синхронизация данных с Bitrix в Elasticsearch
echo "🔄 Запуск инкрементальной синхронизации данных с Bitrix в Elasticsearch..."
sleep 5  # Даем время Elasticsearch полностью запуститься

# Проверяем, что Elasticsearch доступен
ELASTICSEARCH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9200/_cluster/health 2>/dev/null || echo "000")

if [ "$ELASTICSEARCH_CHECK" = "200" ]; then
    echo "✅ Elasticsearch доступен, запускаем инкрементальную синхронизацию..."
    
    # Инициализируем алиас Elasticsearch
    echo "🔧 Инициализация алиаса Elasticsearch..."
    curl -X POST http://localhost:5001/api/incremental-sync/initialize-alias
    
    # Запускаем полную инкрементальную синхронизацию
    echo "📦 Выполнение полной инкрементальной синхронизации..."
    curl -X POST http://localhost:5001/api/incremental-sync/all \
        -H "Content-Type: application/json" \
        -d '{"forceFullSync": true, "batchSize": 200}'
    
    if [ $? -eq 0 ]; then
        echo "✅ Инкрементальная синхронизация данных завершена успешно"
    else
        echo "⚠️  Ошибка при инкрементальной синхронизации данных, но приложение продолжает работать"
    fi
else
    echo "⚠️  Elasticsearch недоступен, пропускаем синхронизацию"
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