#!/bin/bash

# Скрипт для восстановления базы данных MongoDB из резервной копии

# Проверка наличия аргумента с путем к файлу бэкапа
if [ -z "$1" ]; then
  echo "Использование: $0 <путь_к_файлу_бэкапа>"
  echo "Пример: $0 /backup/mongodb/beton-crm-2025-06-07_12-00-00.gz"
  exit 1
fi

BACKUP_FILE=$1
DB_NAME="beton-crm"

# Проверка наличия файла бэкапа
if [ ! -f "$BACKUP_FILE" ]; then
  echo "Ошибка: Файл бэкапа не найден - $BACKUP_FILE"
  exit 1
fi

echo "Начинаем восстановление базы данных $DB_NAME из $BACKUP_FILE..."

# Восстановление из архива
mongorestore --db=$DB_NAME --archive=$BACKUP_FILE --gzip --drop

# Проверка результата
if [ $? -eq 0 ]; then
  echo "Восстановление успешно завершено!"
else
  echo "Ошибка восстановления базы данных!"
  exit 1
fi
