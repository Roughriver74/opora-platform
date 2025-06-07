#!/bin/bash

# Скрипт для перезапуска приложения с помощью PM2

# Директория проекта
PROJECT_DIR="${PROJECT_DIR:-/var/www/beton-crm}"

echo "Перезапуск приложения Beton CRM..."

# Переходим в директорию проекта
cd $PROJECT_DIR

# Перезапускаем приложение
pm2 reload beton-crm || pm2 restart beton-crm

# Сохраняем конфигурацию PM2
pm2 save

# Проверяем статус
echo "Статус приложения после перезапуска:"
pm2 show beton-crm
