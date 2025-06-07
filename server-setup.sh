#!/bin/bash

# Скрипт для настройки сервера под Beton CRM
# Требуется Ubuntu 20.04 или выше

# Обновление системы
echo "Обновление системы..."
sudo apt update && sudo apt upgrade -y

# Установка Node.js
echo "Установка Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Проверка установленной версии Node.js
node -v
npm -v

# Установка PM2
echo "Установка PM2..."
sudo npm install -g pm2

# Настройка PM2 для автозапуска после перезагрузки
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME

# Установка MongoDB
echo "Установка MongoDB..."
sudo apt-get install -y gnupg
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Проверка статуса MongoDB
sudo systemctl status mongod

# Установка Nginx
echo "Установка Nginx..."
sudo apt install -y nginx

# Настройка Nginx
echo "Настройка Nginx..."
sudo rm /etc/nginx/sites-enabled/default
# Создайте свой конфиг на основе nginx.conf и разместите его в нужном месте

# Настройка SSL с Let's Encrypt
echo "Установка Certbot для SSL..."
sudo apt install -y certbot python3-certbot-nginx
# После настройки доменного имени выполните:
# sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Настройка брандмауэра
echo "Настройка брандмауэра..."
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
sudo ufw allow 5000
sudo ufw enable
sudo ufw status

echo "Настройка сервера завершена!"
echo "Теперь вы можете развернуть приложение, используя GitHub Actions или вручную."
