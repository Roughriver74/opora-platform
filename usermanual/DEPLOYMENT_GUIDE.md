# 🚀 Руководство по развертыванию Beton CRM

## 📋 Обзор

Данное руководство покрывает развертывание всех компонентов системы Beton CRM:
- 🌐 **Web приложение** (React)
- 📱 **Mobile приложение** (React Native)
- 🖥️ **Backend API** (Node.js/Express)
- 🗄️ **База данных** (PostgreSQL)
- 🔄 **Кэш** (Redis)

## 🏗️ Архитектура развертывания

### Продакшен окружение
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   Web Server    │    │  Mobile Apps    │
│   (Nginx)       │────│   (Nginx)       │    │  (App Store)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │              ┌─────────────────┐
         └──────────────│   Backend API   │
                        │   (Node.js)     │
                        └─────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
            ┌───────▼───┐ ┌──────▼───┐ ┌─────▼────┐
            │PostgreSQL │ │  Redis   │ │ Bitrix24 │
            │Database   │ │  Cache   │ │   API    │
            └───────────┘ └──────────┘ └──────────┘
```

## 🛠️ Предварительные требования

### Серверные требования
- **OS**: Ubuntu 20.04+ / CentOS 8+ / RHEL 8+
- **RAM**: Минимум 4GB, рекомендуется 8GB+
- **CPU**: 2+ ядра
- **Диск**: 50GB+ свободного места
- **Сеть**: Статический IP адрес

### Программное обеспечение
- **Node.js** 16+ с npm
- **PostgreSQL** 12+
- **Redis** 6+
- **Nginx** 1.18+
- **Docker** (опционально)
- **PM2** для управления процессами
- **Certbot** для SSL сертификатов

## 🚀 Развертывание

### Шаг 1: Подготовка сервера

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка необходимых пакетов
sudo apt install -y curl wget git nginx postgresql postgresql-contrib redis-server

# Установка Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Установка PM2
sudo npm install -g pm2

# Установка Certbot
sudo apt install -y certbot python3-certbot-nginx
```

### Шаг 2: Настройка базы данных

```bash
# Вход в PostgreSQL
sudo -u postgres psql

# Создание базы данных и пользователя
CREATE DATABASE beton_crm;
CREATE USER beton_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE beton_crm TO beton_user;
\q

# Настройка PostgreSQL
sudo nano /etc/postgresql/12/main/postgresql.conf
# Раскомментируйте и измените:
# listen_addresses = 'localhost'
# port = 5432

sudo nano /etc/postgresql/12/main/pg_hba.conf
# Добавьте:
# local   beton_crm    beton_user    md5

# Перезапуск PostgreSQL
sudo systemctl restart postgresql
sudo systemctl enable postgresql
```

### Шаг 3: Настройка Redis

```bash
# Настройка Redis
sudo nano /etc/redis/redis.conf
# Измените:
# bind 127.0.0.1
# port 6379
# requirepass your_redis_password

# Перезапуск Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

### Шаг 4: Развертывание приложения

```bash
# Клонирование репозитория
git clone <repository-url> /var/www/beton-crm
cd /var/www/beton-crm

# Установка зависимостей
npm run install:all

# Сборка приложения
npm run build:all

# Создание пользователя для приложения
sudo useradd -m -s /bin/bash beton
sudo chown -R beton:beton /var/www/beton-crm
```

### Шаг 5: Настройка Backend

```bash
# Создание файла окружения
sudo -u beton nano /var/www/beton-crm/server/.env
```

**Содержимое .env файла:**
```env
NODE_ENV=production
PORT=5001
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=beton_user
DB_PASSWORD=secure_password
DB_DATABASE=beton_crm
JWT_SECRET=your-super-secret-jwt-key
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password
BITRIX24_WEBHOOK_URL=https://your-domain.bitrix24.ru/rest/user_id/webhook_key/
```

```bash
# Запуск миграций
cd /var/www/beton-crm/server
sudo -u beton npm run migration:run

# Создание PM2 конфигурации
sudo -u beton nano /var/www/beton-crm/ecosystem.config.js
```

**Содержимое ecosystem.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'beton-crm-api',
    script: './dist/index.js',
    cwd: '/var/www/beton-crm/server',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5001
    },
    error_file: '/var/log/beton-crm/api-error.log',
    out_file: '/var/log/beton-crm/api-out.log',
    log_file: '/var/log/beton-crm/api-combined.log',
    time: true
  }]
}
```

```bash
# Запуск Backend через PM2
sudo -u beton pm2 start /var/www/beton-crm/ecosystem.config.js
sudo -u beton pm2 save
sudo -u beton pm2 startup
```

### Шаг 6: Настройка Nginx

```bash
# Создание конфигурации Nginx
sudo nano /etc/nginx/sites-available/beton-crm
```

**Содержимое конфигурации:**
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Редирект на HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL сертификаты
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # SSL настройки
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Gzip сжатие
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # API прокси
    location /api/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Статические файлы React
    location / {
        root /var/www/beton-crm/packages/web/build;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Кэширование статических файлов
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Безопасность
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

```bash
# Активация сайта
sudo ln -s /etc/nginx/sites-available/beton-crm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Шаг 7: Настройка SSL

```bash
# Получение SSL сертификата
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Автоматическое обновление сертификатов
sudo crontab -e
# Добавьте:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

### Шаг 8: Настройка мониторинга

```bash
# Установка логирования
sudo mkdir -p /var/log/beton-crm
sudo chown -R beton:beton /var/log/beton-crm

# Настройка logrotate
sudo nano /etc/logrotate.d/beton-crm
```

**Содержимое logrotate:**
```
/var/log/beton-crm/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 beton beton
    postrotate
        pm2 reloadLogs
    endscript
}
```

## 📱 Развертывание мобильного приложения

### Android

#### 1. Подготовка кода подписи

```bash
# Создание keystore
keytool -genkey -v -keystore beton-crm-release-key.keystore -alias beton-crm -keyalg RSA -keysize 2048 -validity 10000

# Настройка gradle.properties
nano packages/mobile/android/gradle.properties
```

**Добавьте в gradle.properties:**
```properties
BETON_UPLOAD_STORE_FILE=beton-crm-release-key.keystore
BETON_UPLOAD_KEY_ALIAS=beton-crm
BETON_UPLOAD_STORE_PASSWORD=your_store_password
BETON_UPLOAD_KEY_PASSWORD=your_key_password
```

#### 2. Сборка APK

```bash
cd packages/mobile
npx react-native run-android --variant=release
```

#### 3. Загрузка в Google Play Console

1. Создайте аккаунт разработчика
2. Создайте приложение в консоли
3. Загрузите APK/AAB файл
4. Заполните информацию о приложении
5. Отправьте на ревью

### iOS

#### 1. Настройка Xcode

```bash
cd packages/mobile/ios
pod install
```

#### 2. Сборка через Xcode

1. Откройте `BetonCRM.xcworkspace` в Xcode
2. Выберите схему "BetonCRM"
3. Настройте Team и Bundle Identifier
4. Соберите для Archive

#### 3. Загрузка в App Store Connect

1. Создайте аккаунт разработчика
2. Создайте приложение в App Store Connect
3. Загрузите через Xcode или Application Loader
4. Заполните информацию о приложении
5. Отправьте на ревью

## 🔄 CI/CD Pipeline

### GitHub Actions

Создайте `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm run install:all
    
    - name: Build application
      run: npm run build:all
    
    - name: Deploy to server
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /var/www/beton-crm
          git pull origin main
          npm run install:all
          npm run build:all
          pm2 reload all
```

## 📊 Мониторинг и логирование

### PM2 Monitoring

```bash
# Установка PM2 Plus
sudo -u beton pm2 install pm2-server-monit

# Мониторинг процессов
sudo -u beton pm2 monit

# Логи
sudo -u beton pm2 logs
```

### Nginx мониторинг

```bash
# Статус Nginx
sudo systemctl status nginx

# Логи Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### База данных мониторинг

```bash
# Подключение к PostgreSQL
sudo -u postgres psql beton_crm

# Проверка подключений
SELECT * FROM pg_stat_activity;

# Размер базы данных
SELECT pg_size_pretty(pg_database_size('beton_crm'));
```

## 🔧 Обслуживание

### Обновление приложения

```bash
# Остановка сервисов
sudo -u beton pm2 stop all

# Обновление кода
cd /var/www/beton-crm
git pull origin main

# Установка зависимостей
npm run install:all

# Сборка
npm run build:all

# Запуск миграций
cd server
npm run migration:run

# Запуск сервисов
sudo -u beton pm2 start all
```

### Резервное копирование

```bash
# Создание скрипта бэкапа
sudo nano /usr/local/bin/backup-beton-crm.sh
```

**Содержимое скрипта:**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/beton-crm"
mkdir -p $BACKUP_DIR

# Бэкап базы данных
pg_dump -h localhost -U beton_user beton_crm > $BACKUP_DIR/db_$DATE.sql

# Бэкап файлов приложения
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /var/www/beton-crm

# Удаление старых бэкапов (старше 30 дней)
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
```

```bash
# Сделать скрипт исполняемым
sudo chmod +x /usr/local/bin/backup-beton-crm.sh

# Добавить в crontab
sudo crontab -e
# Добавьте:
# 0 2 * * * /usr/local/bin/backup-beton-crm.sh
```

## 🚨 Устранение неполадок

### Общие проблемы

1. **Ошибка подключения к базе данных**
   ```bash
   # Проверка статуса PostgreSQL
   sudo systemctl status postgresql
   
   # Проверка подключения
   sudo -u postgres psql -c "SELECT 1;"
   ```

2. **Ошибка Redis**
   ```bash
   # Проверка статуса Redis
   sudo systemctl status redis-server
   
   # Проверка подключения
   redis-cli ping
   ```

3. **Ошибка Nginx**
   ```bash
   # Проверка конфигурации
   sudo nginx -t
   
   # Перезапуск Nginx
   sudo systemctl restart nginx
   ```

4. **Ошибка PM2**
   ```bash
   # Перезапуск всех процессов
   sudo -u beton pm2 restart all
   
   # Просмотр логов
   sudo -u beton pm2 logs
   ```

## 📈 Масштабирование

### Горизонтальное масштабирование

1. **Load Balancer** (HAProxy/Nginx)
2. **Несколько инстансов Backend**
3. **Кластер PostgreSQL**
4. **Redis Cluster**

### Вертикальное масштабирование

1. **Увеличение RAM/CPU**
2. **SSD диски**
3. **Оптимизация запросов**
4. **Кэширование**

## 📝 Заключение

Это руководство покрывает полный процесс развертывания системы Beton CRM в продакшен окружении. Следуйте шагам последовательно и адаптируйте под ваши конкретные требования.

Для получения помощи обращайтесь к документации используемых технологий или создавайте issue в репозитории проекта.