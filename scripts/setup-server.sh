#!/bin/bash

# Скрипт настройки сервера для Beton CRM
# Использование: ./scripts/setup-server.sh

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Настройка сервера для Beton CRM ===${NC}"

# Обновление системы
echo -e "${BLUE}1. Обновление системы...${NC}"
apt update && apt upgrade -y

# Установка Docker если не установлен
if ! command -v docker &> /dev/null; then
    echo -e "${BLUE}2. Установка Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}✓ Docker установлен${NC}"
else
    echo -e "${GREEN}✓ Docker уже установлен${NC}"
fi

# Установка Docker Compose если не установлен
if ! command -v docker-compose &> /dev/null; then
    echo -e "${BLUE}3. Установка Docker Compose...${NC}"
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✓ Docker Compose установлен${NC}"
else
    echo -e "${GREEN}✓ Docker Compose уже установлен${NC}"
fi

# Создание необходимых директорий
echo -e "${BLUE}4. Создание директорий...${NC}"
mkdir -p /var/log/beton-crm
mkdir -p /var/backups/beton-crm
mkdir -p /var/www/beton-crm

# Настройка прав доступа
chown -R root:root /var/www/beton-crm
chmod -R 755 /var/www/beton-crm

echo -e "${GREEN}✓ Директории созданы${NC}"

# Установка PM2 для управления процессами
if ! command -v pm2 &> /dev/null; then
    echo -e "${BLUE}5. Установка PM2...${NC}"
    npm install -g pm2
    echo -e "${GREEN}✓ PM2 установлен${NC}"
else
    echo -e "${GREEN}✓ PM2 уже установлен${NC}"
fi

# Настройка файрвола
echo -e "${BLUE}6. Настройка файрвола...${NC}"
ufw allow 22/tcp   # SSH
ufw allow 3000/tcp # Frontend
ufw allow 5001/tcp # Backend API
ufw allow 9200/tcp # Elasticsearch
ufw allow 5432/tcp # PostgreSQL
ufw allow 6379/tcp # Redis

echo -e "${GREEN}✓ Файрвол настроен${NC}"

echo -e "${GREEN}=== Настройка сервера завершена! ===${NC}"
echo -e "${YELLOW}Сервер готов к деплою Beton CRM${NC}"
