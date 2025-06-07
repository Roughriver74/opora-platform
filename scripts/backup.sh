#!/bin/bash

# Скрипт для резервного копирования базы данных MongoDB
# Сохраняет архивы в директорию backup с датой в имени файла
# Поддерживает ротацию резервных копий (удаляет старые)

# Настройки
DB_NAME="beton-crm"
BACKUP_DIR="/backup/mongodb"
DAYS_TO_KEEP=14  # Количество дней хранения копий

# Создание директории для бэкапа, если она не существует
mkdir -p $BACKUP_DIR

# Текущая дата для имени файла
DATE=$(date +%Y-%m-%d_%H-%M-%S)
ARCHIVE_NAME="$BACKUP_DIR/$DB_NAME-$DATE.gz"

echo "Starting backup of MongoDB database '$DB_NAME' to $ARCHIVE_NAME..."

# Создание резервной копии с компрессией
mongodump --db=$DB_NAME --archive=$ARCHIVE_NAME --gzip

# Проверка результата
if [ $? -eq 0 ]; then
    echo "Backup completed successfully!"
    
    # Статистика файла
    echo "Backup file details:"
    ls -lh $ARCHIVE_NAME
    
    # Удаление старых резервных копий
    echo "Removing backups older than $DAYS_TO_KEEP days..."
    find $BACKUP_DIR -name "$DB_NAME-*.gz" -type f -mtime +$DAYS_TO_KEEP -delete
    
    echo "Backup rotation completed."
else
    echo "Backup failed!"
    exit 1
fi

# Список всех текущих резервных копий
echo "Current backups:"
ls -lh $BACKUP_DIR
