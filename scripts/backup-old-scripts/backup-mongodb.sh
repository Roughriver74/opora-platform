#!/bin/bash

# Скрипт для резервного копирования MongoDB базы данных перед миграцией
# Использование: ./scripts/backup-mongodb.sh

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Параметры сервера
SERVER_USER="root"
SERVER_IP="31.128.39.123"
APP_DIR="/var/www/beton-crm"
BACKUP_DIR="/var/backups/beton-crm"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${YELLOW}=== Создание резервной копии MongoDB перед миграцией ===${NC}"

# Создание бэкапа на сервере
echo -e "${YELLOW}1. Создание резервной копии MongoDB на сервере...${NC}"
ssh $SERVER_USER@$SERVER_IP << ENDSSH
# Создание директории для бэкапов
mkdir -p $BACKUP_DIR/$TIMESTAMP

# Остановка приложения для консистентности данных
if pm2 list | grep -q "beton-crm"; then
    echo "Остановка приложения для создания консистентного бэкапа..."
    pm2 stop beton-crm
fi

# Создание дампа MongoDB
echo "Создание дампа MongoDB..."
mongodump --host localhost --port 27017 --db beton_crm --out $BACKUP_DIR/$TIMESTAMP/mongodb

# Создание архива текущего приложения
echo "Создание архива текущего приложения..."
tar -czf $BACKUP_DIR/$TIMESTAMP/app-backup.tar.gz -C /var/www beton-crm

# Экспорт коллекций в JSON для удобства миграции
echo "Экспорт коллекций в JSON..."
mongoexport --host localhost --port 27017 --db beton_crm --collection users --out $BACKUP_DIR/$TIMESTAMP/users.json
mongoexport --host localhost --port 27017 --db beton_crm --collection forms --out $BACKUP_DIR/$TIMESTAMP/forms.json
mongoexport --host localhost --port 27017 --db beton_crm --collection formfields --out $BACKUP_DIR/$TIMESTAMP/formfields.json
mongoexport --host localhost --port 27017 --db beton_crm --collection submissions --out $BACKUP_DIR/$TIMESTAMP/submissions.json
mongoexport --host localhost --port 27017 --db beton_crm --collection submissionhistories --out $BACKUP_DIR/$TIMESTAMP/submissionhistories.json
mongoexport --host localhost --port 27017 --db beton_crm --collection settings --out $BACKUP_DIR/$TIMESTAMP/settings.json

# Создание манифеста бэкапа
echo "Создание манифеста бэкапа..."
cat > $BACKUP_DIR/$TIMESTAMP/backup_manifest.txt << EOF
Backup Created: $(date)
MongoDB Database: beton_crm
Application Directory: $APP_DIR
Backup Type: Full (MongoDB dump + JSON exports + Application files)

Collections backed up:
- users
- forms  
- formfields
- submissions
- submissionhistories
- settings

Files:
- mongodb/ (MongoDB dump)
- *.json (Collection exports)
- app-backup.tar.gz (Current application)
EOF

# Перезапуск приложения
if pm2 list | grep -q "beton-crm"; then
    echo "Перезапуск приложения..."
    pm2 start beton-crm
fi

echo "Бэкап успешно создан в $BACKUP_DIR/$TIMESTAMP"
ls -la $BACKUP_DIR/$TIMESTAMP/
ENDSSH

# Скачивание бэкапа локально для безопасности
echo -e "${YELLOW}2. Скачивание копии бэкапа локально...${NC}"
LOCAL_BACKUP_DIR="./backups/production/$TIMESTAMP"
mkdir -p "$LOCAL_BACKUP_DIR"

scp -r $SERVER_USER@$SERVER_IP:$BACKUP_DIR/$TIMESTAMP/* "$LOCAL_BACKUP_DIR/"

echo -e "${GREEN}✓ Резервная копия создана и сохранена:${NC}"
echo -e "  Сервер: $BACKUP_DIR/$TIMESTAMP"
echo -e "  Локально: $LOCAL_BACKUP_DIR"

echo -e "${YELLOW}3. Проверка целостности бэкапа...${NC}"
if [ -f "$LOCAL_BACKUP_DIR/backup_manifest.txt" ]; then
    echo -e "${GREEN}✓ Манифест бэкапа найден${NC}"
    cat "$LOCAL_BACKUP_DIR/backup_manifest.txt"
else
    echo -e "${RED}❌ Манифест бэкапа не найден${NC}"
    exit 1
fi

echo -e "${GREEN}=== Резервное копирование завершено успешно! ===${NC}"
echo -e "${YELLOW}Следующий шаг: Выполните деплой нового приложения${NC}"