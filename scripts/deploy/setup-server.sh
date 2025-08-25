#!/bin/bash

# Скрипт для первоначальной настройки сервера под Docker окружение
# Выполняется на сервере после деплоя

echo "🔧 Настройка сервера для Beton CRM..."

# Установка необходимых пакетов
echo "📦 Установка системных пакетов..."
apt update
apt install -y curl wget git nginx certbot python3-certbot-nginx

# Настройка Nginx для проксирования
echo "⚙️ Настройка Nginx..."
cat > /etc/nginx/sites-available/beton-crm << 'EOF'
server {
    listen 80;
    server_name 31.128.39.123;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
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
}
EOF

# Активация конфигурации Nginx
ln -sf /etc/nginx/sites-available/beton-crm /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Настройка файрвола
echo "🔥 Настройка файрвола..."
ufw allow ssh
ufw allow http
ufw allow https
ufw allow 3000/tcp
ufw allow 5001/tcp
ufw --force enable

# Создание системного пользователя для приложения
echo "👤 Создание пользователя приложения..."
if ! id "beton" &>/dev/null; then
    useradd -r -s /bin/false beton
    mkdir -p /home/beton
    chown beton:beton /home/beton
fi

# Настройка логирования
echo "📊 Настройка логирования..."
mkdir -p /var/log/beton-crm
chown beton:beton /var/log/beton-crm

# Создание logrotate конфигурации
cat > /etc/logrotate.d/beton-crm << 'EOF'
/var/log/beton-crm/*.log {
    daily
    missingok
    rotate 14
    compress
    notifempty
    create 644 beton beton
    postrotate
        docker-compose -f /var/www/beton-crm/docker-compose.yml restart backend frontend 2>/dev/null || true
    endscript
}
EOF

# Настройка автоматических обновлений системы
echo "🔄 Настройка автоматических обновлений..."
apt install -y unattended-upgrades
cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

# Настройка мониторинга Docker
echo "🐳 Настройка мониторинга Docker..."
cat > /usr/local/bin/check-docker-services.sh << 'EOF'
#!/bin/bash
cd /var/www/beton-crm
SERVICES="beton_postgres beton_redis beton_backend beton_frontend"
for service in $SERVICES; do
    if ! docker ps | grep -q $service; then
        echo "$(date): $service is down, restarting..." >> /var/log/beton-crm/docker-monitor.log
        docker-compose up -d $service
    fi
done
EOF

chmod +x /usr/local/bin/check-docker-services.sh

# Добавление в crontab
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/check-docker-services.sh") | crontab -

# Настройка резервного копирования
echo "💾 Настройка резервного копирования..."
mkdir -p /var/backups/beton-crm/scheduled
cat > /usr/local/bin/backup-beton-crm.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/beton-crm/scheduled"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
APP_DIR="/var/www/beton-crm"

# Создание бэкапа базы данных
docker exec beton_postgres pg_dump -U beton_user beton_crm > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql"

# Архивирование файлов приложения
tar -czf "$BACKUP_DIR/app_backup_$TIMESTAMP.tar.gz" -C /var/www beton-crm --exclude='node_modules' --exclude='postgres_data' --exclude='redis_data'

# Удаление старых бэкапов (старше 7 дней)
find "$BACKUP_DIR" -name "*.sql" -mtime +7 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete

echo "$(date): Backup completed - $TIMESTAMP" >> /var/log/beton-crm/backup.log
EOF

chmod +x /usr/local/bin/backup-beton-crm.sh

# Добавление ежедневного бэкапа
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-beton-crm.sh") | crontab -

# Проверка и настройка swap если нужно
echo "💿 Проверка swap..."
if [ $(free | grep Swap | awk '{print $2}') -eq 0 ]; then
    echo "Создание swap файла..."
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "✅ Настройка сервера завершена!"
echo "📋 Установленные сервисы:"
echo "  - Docker & Docker Compose"
echo "  - Nginx (reverse proxy)"
echo "  - Автоматические обновления"
echo "  - Мониторинг Docker сервисов (каждые 5 минут)"
echo "  - Ежедневное резервное копирование (02:00)"
echo "  - Ротация логов"
echo "  - Файрвол (UFW)"