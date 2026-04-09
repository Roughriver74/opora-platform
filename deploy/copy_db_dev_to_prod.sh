#!/bin/bash
# Скрипт для копирования базы данных из dev в prod
# Запускать на хостинге с установленным Docker и docker-compose

set -e

echo "=== Копирование базы данных из dev в prod ==="
echo "Этот скрипт копирует все таблицы и данные из dev-базы в prod-базу"
echo "Внимание: Все существующие данные в prod-базе будут удалены!"
echo ""

# Конфигурация
DEV_DB_CONTAINER="dev_db_1"
PROD_DB_CONTAINER="prod_db_1"
DEV_DB_NAME="west_visit_dev"
PROD_DB_NAME="west_visit_prod"
DEV_DB_USER="west_visit"
PROD_DB_USER="west_visit"
DEV_DB_PASSWORD="WestVisit_Dev_Pass_2025"
PROD_DB_PASSWORD="WestVisit_Prod_Pass_2025"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
BACKUP_FILE="/tmp/west_visit_dev_backup_${TIMESTAMP}.sql"

# Проверка наличия контейнеров
echo "Проверка наличия контейнеров..."
if ! docker ps | grep -q "$DEV_DB_CONTAINER"; then
  echo "Ошибка: Контейнер $DEV_DB_CONTAINER не найден или не запущен"
  exit 1
fi

if ! docker ps | grep -q "$PROD_DB_CONTAINER"; then
  echo "Ошибка: Контейнер $PROD_DB_CONTAINER не найден или не запущен"
  exit 1
fi

# Создание резервной копии dev-базы
echo "Создание резервной копии dev-базы данных..."
docker exec -e PGPASSWORD=$DEV_DB_PASSWORD $DEV_DB_CONTAINER pg_dump -U $DEV_DB_USER $DEV_DB_NAME > $BACKUP_FILE

if [ ! -s "$BACKUP_FILE" ]; then
  echo "Ошибка: Не удалось создать резервную копию dev-базы данных"
  exit 1
fi

echo "Резервная копия создана: $BACKUP_FILE ($(du -h $BACKUP_FILE | cut -f1))"

# Проверка наличия таблиц в prod-базе
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
  
  # Удаление всех таблиц в prod-базе
  echo "Удаление всех таблиц в prod-базе..."
  docker exec -e PGPASSWORD=$PROD_DB_PASSWORD $PROD_DB_CONTAINER psql -U $PROD_DB_USER -d $PROD_DB_NAME -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
fi

# Восстановление базы данных в prod
echo "Восстановление базы данных в prod..."
cat $BACKUP_FILE | docker exec -i -e PGPASSWORD=$PROD_DB_PASSWORD $PROD_DB_CONTAINER psql -U $PROD_DB_USER -d $PROD_DB_NAME

# Проверка успешности восстановления
PROD_TABLES_COUNT=$(docker exec -e PGPASSWORD=$PROD_DB_PASSWORD $PROD_DB_CONTAINER psql -U $PROD_DB_USER -d $PROD_DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
PROD_TABLES_COUNT=$(echo $PROD_TABLES_COUNT | tr -d ' ')

echo "Количество таблиц в prod-базе после восстановления: $PROD_TABLES_COUNT"

if [ "$PROD_TABLES_COUNT" -gt "0" ]; then
  echo "Восстановление успешно завершено!"
  
  # Обновление записи о среде в таблице migrations, если она существует
  echo "Обновление записей о среде в таблице migrations..."
  docker exec -e PGPASSWORD=$PROD_DB_PASSWORD $PROD_DB_CONTAINER psql -U $PROD_DB_USER -d $PROD_DB_NAME -c "UPDATE migrations SET environment = 'production' WHERE environment = 'development';"
  
  # Удаление временного файла
  rm -f $BACKUP_FILE
  echo "Временный файл удален"
  
  echo "=== Копирование базы данных завершено ==="
  echo "Теперь вы можете перезапустить контейнеры prod:"
  echo "cd /path/to/west_visit/visits/deploy && docker-compose -f docker-compose.prod.yml restart"
else
  echo "Ошибка: Восстановление не удалось. В prod-базе нет таблиц."
  echo "Проверьте журналы Docker для получения дополнительной информации."
  exit 1
fi
