#!/bin/bash

# Скрипт для деплоя приложения на сервер
echo "Starting deployment..."

# Параметры сервера
SERVER_USER="root"
SERVER_IP="31.128.39.123"
APP_DIR="/var/www/beton-crm"

# Сборка проекта
echo "Building the project..."
npm run build

# Создаем временную директорию для архива
TIMESTAMP=$(date +%s)
ARCHIVE_NAME="deploy-${TIMESTAMP}.tar.gz"

# Создаем архив с собранным проектом
echo "Creating archive..."
tar -czf "$ARCHIVE_NAME" \
    --exclude="node_modules" \
    --exclude=".git" \
    --exclude="client/node_modules" \
    --exclude="server/node_modules" \
    server/dist \
    server/package.json \
    server/package-lock.json \
    client/build \
    package.json \
    ecosystem.config.js

# Передаем архив на сервер
echo "Sending archive to server..."
sshpass -p "6nu!68xA4V4O" scp "$ARCHIVE_NAME" ${SERVER_USER}@${SERVER_IP}:${APP_DIR}/

# Выполняем команды на сервере
echo "Deploying on server..."
sshpass -p "6nu!68xA4V4O" ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
    # Переходим в директорию приложения
    cd /var/www/beton-crm

    # Получаем имя последнего загруженного архива
    LATEST_ARCHIVE=$(ls -t deploy-*.tar.gz | head -1)
    
    # Создаем бэкап текущей версии, если она существует
    if [ -d "server" ]; then
        BACKUP_NAME="backup-$(date +%s).tar.gz"
        tar -czf "$BACKUP_NAME" server client ecosystem.config.js package.json
        mkdir -p backups
        mv "$BACKUP_NAME" backups/
    fi

    # Распаковываем архив
    tar -xzf "$LATEST_ARCHIVE"
    
    # Устанавливаем зависимости
    cd server && npm install --production
    cd ..
    
    # Перезапускаем приложение с PM2
    if pm2 list | grep -q "beton-crm"; then
        pm2 reload beton-crm
    else
        pm2 start ecosystem.config.js --env production
    fi
    
    # Очистка старых архивов (оставляем только 3 последних)
    ls -t deploy-*.tar.gz | tail -n +4 | xargs -I {} rm {} 2>/dev/null || true
    
    echo "Deployment completed successfully!"
ENDSSH

# Удаляем локальный архив
rm "$ARCHIVE_NAME"

echo "Deployment process finished!"
