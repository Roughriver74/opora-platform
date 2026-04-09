#!/bin/bash

# Скрипт для деплоя West Visit на сервер
# Использование: ./deploy.sh [prod|dev]

# Проверка аргументов
if [ "$1" != "prod" ] && [ "$1" != "dev" ]; then
  echo "Использование: ./deploy.sh [prod|dev]"
  exit 1
fi

ENV=$1
SERVER="root@31.128.37.26"
DEPLOY_PATH="/var/www/west-visit/$ENV"
DOCKER_COMPOSE_FILE="docker-compose.$ENV.yml"
NGINX_CONF="nginx-$ENV.conf"

echo "Начинаем деплой в окружение: $ENV"

# Создание директорий на сервере
echo "Создание директорий..."
ssh $SERVER "mkdir -p $DEPLOY_PATH"

# Копирование docker-compose файла
echo "Копирование docker-compose файла..."
scp deploy/$DOCKER_COMPOSE_FILE $SERVER:$DEPLOY_PATH/docker-compose.yml

# Копирование проекта
echo "Копирование проекта..."
rsync -avz --exclude='.git/' --exclude='node_modules/' --exclude='deploy/' ./ $SERVER:$DEPLOY_PATH/

# Копирование nginx конфигурации
echo "Копирование nginx конфигурации..."
scp deploy/$NGINX_CONF $SERVER:/etc/nginx/sites-available/$(if [ "$ENV" == "prod" ]; then echo "visit.west-it.ru"; else echo "dev.visit.west-it.ru"; fi)

# Создание символической ссылки для nginx
echo "Активация nginx конфигурации..."
DOMAIN=$(if [ "$ENV" == "prod" ]; then echo "visit.west-it.ru"; else echo "dev.visit.west-it.ru"; fi)
ssh $SERVER "ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/ && nginx -t && systemctl reload nginx"

echo "Проверка SSL сертификатов..."
ssh $SERVER "if [ ! -d /etc/letsencrypt/live/$DOMAIN ]; then certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@west-it.ru; fi"

echo "Запуск контейнеров..."
ssh $SERVER "cd $DEPLOY_PATH && docker-compose down && docker-compose build && docker-compose up -d"

echo "Деплой в окружение $ENV завершен успешно!"
