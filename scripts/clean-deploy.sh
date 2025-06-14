#!/bin/bash

# Скрипт для полной очистки и переустановки приложения beton-crm
# Удаляет все файлы, очищает базу данных и делает чистую установку
# Использование: ./scripts/clean-deploy.sh

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Параметры сервера
SERVER_USER="root"
SERVER_IP="31.128.39.123"
APP_DIR="/var/www/beton-crm"
DB_NAME="beton-crm"

echo -e "${RED}=== ВНИМАНИЕ: ПОЛНАЯ ОЧИСТКА СЕРВЕРА И ПЕРЕУСТАНОВКА ===${NC}"
echo -e "${YELLOW}Этот скрипт выполнит:${NC}"
echo -e "1. Остановку и удаление приложения из PM2"
echo -e "2. Полное удаление всех файлов приложения"
echo -e "3. Очистку базы данных MongoDB"
echo -e "4. Чистую установку приложения"
echo ""
echo -e "${RED}ВСЕ ДАННЫЕ БУДУТ УДАЛЕНЫ!${NC}"
echo ""
read -p "Вы уверены, что хотите продолжить? (введите 'YES' для подтверждения): " confirmation

if [ "$confirmation" != "YES" ]; then
    echo -e "${YELLOW}Операция отменена.${NC}"
    exit 0
fi

echo -e "${BLUE}=== НАЧИНАЕМ ПОЛНУЮ ОЧИСТКУ И ПЕРЕУСТАНОВКУ ===${NC}"

# 1. Настройка API URL для фронтенда
echo -e "${YELLOW}1. Настройка API URL для фронтенда...${NC}"
ENV_FILE="client/.env"
ENV_BACKUP="client/.env.backup"

if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "$ENV_BACKUP"
    echo -e "${GREEN}✓ Создана резервная копия .env файла${NC}"
    echo "REACT_APP_API_URL=" > "$ENV_FILE"
    echo -e "${GREEN}✓ Установлен API URL для продакшн-сборки${NC}"
fi

# 2. Сборка проекта
echo -e "${YELLOW}2. Сборка проекта...${NC}"
npm run build
BUILD_STATUS=$?

# Восстанавливаем оригинальный .env файл после сборки
if [ -f "$ENV_BACKUP" ]; then
    mv "$ENV_BACKUP" "$ENV_FILE"
    echo -e "${GREEN}✓ Восстановлен оригинальный .env файл${NC}"
fi

if [ $BUILD_STATUS -ne 0 ]; then
    echo -e "${RED}Ошибка при сборке проекта!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Проект успешно собран${NC}"

# 3. Создание архива для деплоя
echo -e "${YELLOW}3. Создание архива для деплоя...${NC}"
ARCHIVE_NAME="clean-deploy-$(date +%s).tar.gz"
tar -czf "$ARCHIVE_NAME" \
    --exclude="node_modules" \
    --exclude=".git" \
    --exclude="client/node_modules" \
    --exclude="server/node_modules" \
    server/dist \
    server/package.json \
    server/package-lock.json \
    client/build \
    package.json \
    ecosystem.config.js

echo -e "${GREEN}✓ Архив $ARCHIVE_NAME успешно создан${NC}"

# 4. Проверка соединения с сервером
echo -e "${YELLOW}4. Проверка соединения с сервером...${NC}"
ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "echo 'Соединение установлено'"
if [ $? -ne 0 ]; then
    echo -e "${RED}Ошибка соединения с сервером!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Соединение с сервером успешно установлено${NC}"

# 5. Полная очистка сервера и переустановка
echo -e "${YELLOW}5. Выполнение полной очистки на сервере...${NC}"
ssh $SERVER_USER@$SERVER_IP << ENDSSH
echo -e "${RED}=== НАЧИНАЕМ ПОЛНУЮ ОЧИСТКУ СЕРВЕРА ===${NC}"

# Остановка и удаление приложения из PM2
echo "Остановка приложения PM2..."
pm2 stop beton-crm 2>/dev/null || echo "Приложение не запущено"
pm2 delete beton-crm 2>/dev/null || echo "Приложение не найдено в PM2"
pm2 save

# Создание финальной резервной копии (если нужно)
if [ -d "$APP_DIR" ]; then
    echo "Создание финальной резервной копии..."
    FINAL_BACKUP="/tmp/beton-crm-final-backup-\$(date +%s).tar.gz"
    tar -czf "\$FINAL_BACKUP" "$APP_DIR" 2>/dev/null || echo "Не удалось создать резервную копию"
    echo "Резервная копия сохранена в: \$FINAL_BACKUP"
fi

# Полное удаление директории приложения
echo -e "${RED}Удаление всех файлов приложения...${NC}"
rm -rf "$APP_DIR"
echo -e "${GREEN}✓ Все файлы приложения удалены${NC}"

# Очистка базы данных MongoDB
echo -e "${RED}Очистка базы данных MongoDB...${NC}"
mongosh "$DB_NAME" --eval "db.dropDatabase()" || echo "База данных уже не существует"
echo -e "${GREEN}✓ База данных очищена${NC}"

# Создание чистой директории
echo "Создание чистой директории приложения..."
mkdir -p "$APP_DIR"
cd "$APP_DIR"

echo -e "${GREEN}✓ Полная очистка сервера завершена${NC}"
ENDSSH

# 6. Копирование файлов на очищенный сервер
echo -e "${YELLOW}6. Копирование файлов на очищенный сервер...${NC}"
scp "$ARCHIVE_NAME" $SERVER_USER@$SERVER_IP:$APP_DIR/
echo -e "${GREEN}✓ Архив скопирован на сервер${NC}"

# Копирование .env файла
if [ -f ".env.production" ]; then
    echo -e "${YELLOW}7. Копирование .env файла...${NC}"
    scp ".env.production" $SERVER_USER@$SERVER_IP:$APP_DIR/.env
    echo -e "${GREEN}✓ .env файл скопирован${NC}"
fi

# 7. Чистая установка на сервере
echo -e "${YELLOW}8. Чистая установка приложения на сервере...${NC}"
ssh $SERVER_USER@$SERVER_IP << ENDSSH
cd "$APP_DIR"

echo -e "${BLUE}=== НАЧИНАЕМ ЧИСТУЮ УСТАНОВКУ ===${NC}"

# Распаковка архива
echo "Распаковка архива..."
tar -xzf "$ARCHIVE_NAME"
echo -e "${GREEN}✓ Архив распакован${NC}"

# Установка зависимостей серверной части
echo "Установка зависимостей серверной части..."
cd server
npm ci --production --silent
echo -e "${GREEN}✓ Зависимости сервера установлены${NC}"
cd ..

# Проверка и копирование .env файла в server директорию
if [ ! -f "server/.env" ] && [ -f ".env" ]; then
    echo "Копирование .env файла в директорию server..."
    cp .env server/.env
    echo -e "${GREEN}✓ .env файл скопирован в server/${NC}"
fi

# Проверка подключения к MongoDB и создание администратора
echo "Создание администратора по умолчанию..."
cd server
npm run create-default-admin:prod 2>/dev/null || {
    echo "Попытка альтернативного метода создания администратора..."
    node dist/scripts/createDefaultAdmin.js 2>/dev/null || echo "⚠️  Предупреждение: Не удалось создать администратора автоматически"
}
cd ..

# Установка PM2 глобально, если он не установлен
if ! command -v pm2 &> /dev/null; then
    echo "Установка PM2 глобально..."
    npm install pm2 -g
    echo -e "${GREEN}✓ PM2 установлен${NC}"
fi

# Запуск приложения с новой конфигурацией
echo "Запуск приложения..."
pm2 start ecosystem.config.js --env production
pm2 save

# Настройка автозапуска PM2
echo "Настройка автозапуска PM2..."
pm2 startup | grep -v PM2 | bash || echo "Автозапуск уже настроен"

# Очистка временных файлов
echo "Очистка временных файлов..."
rm -f "$ARCHIVE_NAME"

echo -e "${GREEN}=== ЧИСТАЯ УСТАНОВКА ЗАВЕРШЕНА УСПЕШНО! ===${NC}"
ENDSSH

# 8. Удаление локального архива
rm "$ARCHIVE_NAME"

# 9. Проверка работоспособности
echo -e "${YELLOW}9. Проверка работоспособности приложения...${NC}"
sleep 5

# Проверка статуса PM2
echo "Проверка статуса PM2:"
ssh $SERVER_USER@$SERVER_IP "pm2 status"

# Проверка API
echo "Проверка API:"
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://$SERVER_IP:5001/)
if [ "$API_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ API работает корректно${NC}"
else
    echo -e "${YELLOW}⚠️  API вернул код: $API_RESPONSE${NC}"
fi

echo -e "${GREEN}=== ПОЛНАЯ ПЕРЕУСТАНОВКА УСПЕШНО ЗАВЕРШЕНА! ===${NC}"
echo ""
echo -e "${BLUE}=== ИНФОРМАЦИЯ О ДОСТУПЕ ===${NC}"
echo -e "${YELLOW}Приложение доступно по адресам:${NC}"
echo -e "  - https://beton.shknv.ru"
echo -e "  - http://$SERVER_IP"
echo ""
echo -e "${GREEN}=== УЧЕТНЫЕ ДАННЫЕ ДЛЯ ВХОДА ===${NC}"
echo -e "${YELLOW}Email:${NC} crm@betonexpress.pro"
echo -e "${YELLOW}Пароль:${NC} Sacre.net13"
echo ""
echo -e "${RED}⚠️  ВАЖНО: После первого входа обязательно смените пароль!${NC}"
echo ""
echo -e "${BLUE}=== ДЛЯ ДИАГНОСТИКИ ИСПОЛЬЗУЙТЕ ===${NC}"
echo -e "Логи приложения: ${GREEN}ssh $SERVER_USER@$SERVER_IP 'pm2 logs beton-crm'${NC}"
echo -e "Статус приложения: ${GREEN}ssh $SERVER_USER@$SERVER_IP 'pm2 status'${NC}"
echo -e "Перезапуск: ${GREEN}ssh $SERVER_USER@$SERVER_IP 'pm2 restart beton-crm'${NC}" 