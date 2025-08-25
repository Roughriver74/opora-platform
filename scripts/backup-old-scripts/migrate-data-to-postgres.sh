#!/bin/bash

# Скрипт для миграции данных из MongoDB бэкапа в PostgreSQL
# Использование: ./scripts/migrate-data-to-postgres.sh [backup_timestamp]

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
BACKUP_DIR="/var/backups/beton-crm"

# Получение временной метки бэкапа
if [ -z "$1" ]; then
    echo -e "${YELLOW}Поиск последнего бэкапа...${NC}"
    BACKUP_TIMESTAMP=$(ssh $SERVER_USER@$SERVER_IP "ls -1t $BACKUP_DIR/ | head -1")
    if [ -z "$BACKUP_TIMESTAMP" ]; then
        echo -e "${RED}❌ Бэкапы не найдены!${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Найден последний бэкап: $BACKUP_TIMESTAMP${NC}"
else
    BACKUP_TIMESTAMP="$1"
fi

echo -e "${YELLOW}=== Миграция данных из MongoDB в PostgreSQL ===${NC}"
echo -e "${BLUE}Бэкап: $BACKUP_TIMESTAMP${NC}"

# Проверка что PostgreSQL контейнер запущен
echo -e "${BLUE}1. Проверка состояния PostgreSQL...${NC}"
ssh $SERVER_USER@$SERVER_IP << ENDSSH
cd $APP_DIR
if ! docker-compose ps | grep -q "beton_postgres.*Up"; then
    echo "❌ PostgreSQL контейнер не запущен!"
    echo "Запуск PostgreSQL..."
    docker-compose up -d postgres
    sleep 20
fi
echo "✅ PostgreSQL контейнер запущен"
ENDSSH

# Копирование скрипта миграции на сервер
echo -e "${BLUE}2. Подготовка скрипта миграции...${NC}"
cat > migrate-json-to-postgres.js << 'EOFSCRIPT'
const fs = require('fs');
const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'beton_user',
  password: 'beton_password_secure_2025',
  database: 'beton_crm',
});

async function migrateData(backupPath) {
  try {
    await client.connect();
    console.log('✅ Подключение к PostgreSQL установлено');

    // Очистка существующих данных
    console.log('🧹 Очистка существующих данных...');
    await client.query('DELETE FROM submission_histories');
    await client.query('DELETE FROM submissions'); 
    await client.query('DELETE FROM form_fields');
    await client.query('DELETE FROM forms');
    await client.query('DELETE FROM users WHERE email != \'crm@betonexpress.pro\'');
    await client.query('DELETE FROM settings');

    // Миграция пользователей
    console.log('👥 Миграция пользователей...');
    const usersData = JSON.parse(fs.readFileSync(`${backupPath}/users.json`, 'utf8'));
    const users = usersData.split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
    
    for (const user of users) {
      if (user.email === 'crm@betonexpress.pro') continue; // Пропускаем админа
      
      await client.query(`
        INSERT INTO users (id, email, first_name, last_name, phone, bitrix_user_id, status, role, is_active, settings, last_login, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (email) DO NOTHING
      `, [
        user._id || require('crypto').randomUUID(),
        user.email,
        user.firstName || '',
        user.lastName || '',
        user.phone || '',
        user.bitrixUserId || null,
        user.status || 'active',
        user.role || 'user',
        user.isActive !== false,
        JSON.stringify(user.settings || {}),
        user.lastLogin ? new Date(user.lastLogin) : null,
        user.createdAt ? new Date(user.createdAt) : new Date(),
        user.updatedAt ? new Date(user.updatedAt) : new Date()
      ]);
    }
    console.log(`✅ Пользователи мигрированы: ${users.length}`);

    // Миграция форм
    console.log('📋 Миграция форм...');
    const formsData = JSON.parse(fs.readFileSync(`${backupPath}/forms.json`, 'utf8'));
    const forms = formsData.split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
    
    for (const form of forms) {
      await client.query(`
        INSERT INTO forms (id, name, title, description, is_active, settings, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        form._id || require('crypto').randomUUID(),
        form.name,
        form.title,
        form.description || '',
        form.isActive !== false,
        JSON.stringify(form.settings || {}),
        form.createdAt ? new Date(form.createdAt) : new Date(),
        form.updatedAt ? new Date(form.updatedAt) : new Date()
      ]);
    }
    console.log(`✅ Формы мигрированы: ${forms.length}`);

    // Миграция полей форм
    console.log('🔧 Миграция полей форм...');
    const fieldsData = JSON.parse(fs.readFileSync(`${backupPath}/formfields.json`, 'utf8'));
    const fields = fieldsData.split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
    
    for (const field of fields) {
      await client.query(`
        INSERT INTO form_fields (id, form_id, name, label, type, required, validation, options, placeholder, help_text, "order", section, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [
        field._id || require('crypto').randomUUID(),
        field.formId,
        field.name,
        field.label,
        field.type,
        field.required || false,
        JSON.stringify(field.validation || {}),
        JSON.stringify(field.options || []),
        field.placeholder || '',
        field.helpText || '',
        field.order || 0,
        field.section || 'default',
        field.isActive !== false,
        field.createdAt ? new Date(field.createdAt) : new Date(),
        field.updatedAt ? new Date(field.updatedAt) : new Date()
      ]);
    }
    console.log(`✅ Поля форм мигрированы: ${fields.length}`);

    // Миграция заявок
    console.log('📝 Миграция заявок...');
    const submissionsData = JSON.parse(fs.readFileSync(`${backupPath}/submissions.json`, 'utf8'));
    const submissions = submissionsData.split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
    
    for (const submission of submissions) {
      await client.query(`
        INSERT INTO submissions (id, form_id, user_id, data, status, bitrix_deal_id, bitrix_contact_id, metadata, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        submission._id || require('crypto').randomUUID(),
        submission.formId,
        submission.userId || null,
        JSON.stringify(submission.data || {}),
        submission.status || 'pending',
        submission.bitrixDealId || null,
        submission.bitrixContactId || null,
        JSON.stringify(submission.metadata || {}),
        submission.createdAt ? new Date(submission.createdAt) : new Date(),
        submission.updatedAt ? new Date(submission.updatedAt) : new Date()
      ]);
    }
    console.log(`✅ Заявки мигрированы: ${submissions.length}`);

    // Миграция истории заявок
    console.log('📈 Миграция истории заявок...');
    if (fs.existsSync(`${backupPath}/submissionhistories.json`)) {
      const historiesData = JSON.parse(fs.readFileSync(`${backupPath}/submissionhistories.json`, 'utf8'));
      const histories = historiesData.split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
      
      for (const history of histories) {
        await client.query(`
          INSERT INTO submission_histories (id, submission_id, action, details, user_id, created_at)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          history._id || require('crypto').randomUUID(),
          history.submissionId,
          history.action,
          JSON.stringify(history.details || {}),
          history.userId || null,
          history.createdAt ? new Date(history.createdAt) : new Date()
        ]);
      }
      console.log(`✅ История заявок мигрирована: ${histories.length}`);
    }

    // Миграция настроек
    console.log('⚙️ Миграция настроек...');
    if (fs.existsSync(`${backupPath}/settings.json`)) {
      const settingsData = JSON.parse(fs.readFileSync(`${backupPath}/settings.json`, 'utf8'));
      const settings = settingsData.split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
      
      for (const setting of settings) {
        await client.query(`
          INSERT INTO settings (id, key, value, description, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          setting._id || require('crypto').randomUUID(),
          setting.key,
          JSON.stringify(setting.value),
          setting.description || '',
          setting.createdAt ? new Date(setting.createdAt) : new Date(),
          setting.updatedAt ? new Date(setting.updatedAt) : new Date()
        ]);
      }
      console.log(`✅ Настройки мигрированы: ${settings.length}`);
    }

    console.log('🎉 Миграция данных завершена успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка миграции:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Запуск миграции
const backupPath = process.argv[2];
if (!backupPath) {
  console.error('❌ Укажите путь к бэкапу');
  process.exit(1);
}

migrateData(backupPath);
EOFSCRIPT

scp migrate-json-to-postgres.js $SERVER_USER@$SERVER_IP:$APP_DIR/

# Выполнение миграции на сервере
echo -e "${BLUE}3. Выполнение миграции данных...${NC}"
ssh $SERVER_USER@$SERVER_IP << ENDSSH
cd $APP_DIR

# Установка pg клиента если не установлен
if ! node -e "require('pg')" 2>/dev/null; then
    echo "Установка PostgreSQL клиента для Node.js..."
    npm install pg
fi

# Запуск миграции
echo "Запуск миграции данных..."
node migrate-json-to-postgres.js $BACKUP_DIR/$BACKUP_TIMESTAMP

# Проверка результатов
echo "Проверка результатов миграции:"
docker-compose exec -T postgres psql -U beton_user -d beton_crm -c "
SELECT 
    (SELECT COUNT(*) FROM users) as users_count,
    (SELECT COUNT(*) FROM forms) as forms_count,
    (SELECT COUNT(*) FROM form_fields) as fields_count,
    (SELECT COUNT(*) FROM submissions) as submissions_count,
    (SELECT COUNT(*) FROM submission_histories) as histories_count,
    (SELECT COUNT(*) FROM settings) as settings_count;
"

# Очистка временных файлов
rm -f migrate-json-to-postgres.js
ENDSSH

# Очистка локальных файлов
rm -f migrate-json-to-postgres.js

echo -e "${GREEN}=== Миграция данных завершена! ===${NC}"
echo -e "${YELLOW}Следующий шаг: Проверьте работоспособность приложения${NC}"