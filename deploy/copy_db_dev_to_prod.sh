#!/bin/bash
# Скрипт для копирования базы данных из dev в prod (OPORA Platform)
# Запускать на сервере с установленным Docker и docker-compose

set -e

echo "=== OPORA: Копирование базы данных из dev в prod ==="
echo "Этот скрипт копирует все таблицы и данные из dev-базы в prod-базу"
echo "Внимание: Все существующие данные в prod-базе будут удалены!"
echo ""

DEV_DB_CONTAINER="opora_postgres_dev"
PROD_DB_CONTAINER="opora_postgres_prod"
DEV_DB_NAME="${POSTGRES_DB:-opora_dev}"
PROD_DB_NAME="opora_prod"
DEV_DB_USER="${POSTGRES_USER:-opora_user}"
PROD_DB_USER="opora_user"
DEV_DB_PASSWORD="${POSTGRES_PASSWORD:-opora_dev_pass}"
PROD_DB_PASSWORD="${PROD_POSTGRES_PASSWORD:-opora_prod_pass}"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
BACKUP_FILE="/tmp/opora_dev_backup_${TIMESTAMP}.sql"

echo "Проверка наличия контейнеров..."
if ! docker ps | grep -q "$DEV_DB_CONTAINER"; then
  echo "Ошибка: Контейнер $DEV_DB_CONTAINER не найден или не запущен"
  exit 1
fi

if ! docker ps | grep -q "$PROD_DB_CONTAINER"; then
  echo "Ошибка: Контейнер $PROD_DB_CONTAINER не найден или не запущен"
  exit 1
fi

echo "Создание резервной копии dev-базы данных..."
docker exec -e PGPASSWORD=$DEV_DB_PASSWORD $DEV_DB_CONTAINER pg_dump -U $DEV_DB_USER $DEV_DB_NAME > $BACKUP_FILE

if [ ! -s "$BACKUP_FILE" ]; then
  echo "Ошибка: Не удалось создать резервную копию dev-базы данных"
  exit 1
fi

echo "Резервная копия создана: $BACKUP_FILE ($(du -h $BACKUP_FILE | cut -f1))"

echo "Проверка наличия таблиц в prod-базе..."
TABLES_COUNT=$(docker exec -e PGPASSWORD=$PROD_DB_PASSWORD $PROD_DB_CONTAINER psql -U $PROD_DB_USER -d $PROD_DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
TABLES_COUNT=$(echo $TABLES_COUNT | tr -d ' ')

if [ "$TABLES_COUNT" -gt "0" ]; then
  echo "В prod-базе уже есть $TABLES_COUNT таблиц."
  read -p "Вы уверены, что хотите удалить все данные в prod-базе? (y/n): " CONFIRM
  if [ "$CONFIRM" != "y" ]; then
    echo "Операция отменена пользователем"
    rm -f $BACKUP_FILE
    exit 0
  fi

  echo "Удаление всех таблиц в prod-базе..."
  docker exec -e PGPASSWORD=$PROD_DB_PASSWORD $PROD_DB_CONTAINER psql -U $PROD_DB_USER -d $PROD_DB_NAME -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
fi

echo "Восстановление базы данных в prod..."
cat $BACKUP_FILE | docker exec -i -e PGPASSWORD=$PROD_DB_PASSWORD $PROD_DB_CONTAINER psql -U $PROD_DB_USER -d $PROD_DB_NAME

PROD_TABLES_COUNT=$(docker exec -e PGPASSWORD=$PROD_DB_PASSWORD $PROD_DB_CONTAINER psql -U $PROD_DB_USER -d $PROD_DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
PROD_TABLES_COUNT=$(echo $PROD_TABLES_COUNT | tr -d ' ')

echo "Количество таблиц в prod-базе после восстановления: $PROD_TABLES_COUNT"

if [ "$PROD_TABLES_COUNT" -gt "0" ]; then
  echo "Восстановление успешно завершено!"
  rm -f $BACKUP_FILE
  echo "Временный файл удален"

  echo "=== Копирование базы данных завершено ==="
  echo "Теперь вы можете перезапустить контейнеры prod:"
  echo "cd /var/www/opora/prod && docker-compose -f docker-compose.yml restart"
else
  echo "Ошибка: Восстановление не удалось."
  exit 1
fi
