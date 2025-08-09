"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const pg_1 = require("pg");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const backupPath = '/Users/evgenijsikunov/projects/beton-crm/beton-crm/backups/2025-06-23T15-55-14/db';
async function importBackupData() {
    console.log('🚀 Начало импорта данных из бэкапа...');
    // Подключение к PostgreSQL
    const connectionString = `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
    console.log('📡 Подключение к PostgreSQL...');
    try {
        const client = new pg_1.Client({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT || '5432'),
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        await client.connect();
        console.log('✅ Подключено к PostgreSQL');
        // Создание таблиц если их нет
        console.log('🔨 Создание таблиц...');
        // Таблица пользователей
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                phone VARCHAR(50),
                role VARCHAR(50) DEFAULT 'user',
                status VARCHAR(50) DEFAULT 'active',
                is_active BOOLEAN DEFAULT true,
                settings JSONB DEFAULT '{}',
                bitrix_user_id VARCHAR(100),
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // Таблица форм
        await client.query(`
            CREATE TABLE IF NOT EXISTS forms (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) UNIQUE NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                is_active BOOLEAN DEFAULT true,
                bitrix_deal_category VARCHAR(50),
                success_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // Таблица полей форм
        await client.query(`
            CREATE TABLE IF NOT EXISTS form_fields (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                label VARCHAR(255) NOT NULL,
                type VARCHAR(50) NOT NULL,
                required BOOLEAN DEFAULT false,
                placeholder VARCHAR(255),
                bitrix_field_id VARCHAR(100),
                bitrix_field_type VARCHAR(50),
                bitrix_entity VARCHAR(50),
                section_id VARCHAR(100),
                options JSONB,
                dynamic_source JSONB,
                linked_fields JSONB,
                "order" INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // Таблица заявок
        await client.query(`
            CREATE TABLE IF NOT EXISTS submissions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                submission_number VARCHAR(50) UNIQUE NOT NULL,
                form_id UUID REFERENCES forms(id),
                user_id UUID REFERENCES users(id),
                title VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'NEW',
                priority VARCHAR(50) DEFAULT 'medium',
                assigned_to_id UUID REFERENCES users(id),
                notes TEXT,
                tags TEXT[],
                bitrix_deal_id VARCHAR(100),
                bitrix_category_id VARCHAR(50),
                bitrix_sync_status VARCHAR(50) DEFAULT 'pending',
                bitrix_sync_error TEXT,
                form_name VARCHAR(255),
                form_title VARCHAR(255),
                user_email VARCHAR(255),
                user_name VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Таблицы созданы');
        // Импорт данных
        console.log('📥 Импорт данных...');
        // Импорт пользователей
        const usersData = JSON.parse(fs.readFileSync(path.join(backupPath, 'users.json'), 'utf8'));
        console.log(`📥 Импорт ${usersData.length} пользователей...`);
        for (const user of usersData) {
            try {
                await client.query(`
                    INSERT INTO users (
                        email, password, first_name, last_name, phone,
                        role, status, is_active, settings, bitrix_user_id,
                        created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    ON CONFLICT (email) DO NOTHING
                `, [
                    user.email,
                    user.password,
                    user.firstName || user.first_name,
                    user.lastName || user.last_name,
                    user.phone,
                    user.role,
                    user.status,
                    user.isActive !== false,
                    JSON.stringify(user.settings || {}),
                    user.bitrix_id,
                    new Date(user.createdAt),
                    new Date(user.updatedAt)
                ]);
            }
            catch (err) {
                console.error(`Ошибка импорта пользователя ${user.email}:`, err);
            }
        }
        // Импорт форм
        const formsData = JSON.parse(fs.readFileSync(path.join(backupPath, 'forms.json'), 'utf8'));
        console.log(`📥 Импорт ${formsData.length} форм...`);
        // Создание маппинга старых ID к новым
        const formIdMap = {};
        for (const form of formsData) {
            try {
                const result = await client.query(`
                    INSERT INTO forms (
                        name, title, description, is_active,
                        bitrix_deal_category, success_message,
                        created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (name) DO UPDATE SET
                        title = EXCLUDED.title,
                        description = EXCLUDED.description
                    RETURNING id
                `, [
                    form.name,
                    form.title,
                    form.description,
                    form.isActive !== false,
                    form.bitrixDealCategory,
                    form.successMessage,
                    new Date(form.createdAt),
                    new Date(form.updatedAt)
                ]);
                formIdMap[form._id] = result.rows[0].id;
            }
            catch (err) {
                console.error(`Ошибка импорта формы ${form.name}:`, err);
            }
        }
        // Импорт полей форм
        const fieldsData = JSON.parse(fs.readFileSync(path.join(backupPath, 'formfields.json'), 'utf8'));
        console.log(`📥 Импорт ${fieldsData.length} полей форм...`);
        for (const field of fieldsData) {
            try {
                const newFormId = formIdMap[field.formId];
                if (!newFormId)
                    continue;
                await client.query(`
                    INSERT INTO form_fields (
                        form_id, name, label, type, required,
                        placeholder, bitrix_field_id, bitrix_field_type,
                        bitrix_entity, section_id, options,
                        dynamic_source, linked_fields, "order",
                        created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                `, [
                    newFormId,
                    field.name,
                    field.label,
                    field.type,
                    field.required || false,
                    field.placeholder,
                    field.bitrixFieldId,
                    field.bitrixFieldType,
                    field.bitrixEntity,
                    field.sectionId,
                    JSON.stringify(field.options || []),
                    JSON.stringify(field.dynamicSource || {}),
                    JSON.stringify(field.linkedFields || {}),
                    field.order || 0,
                    new Date(field.createdAt),
                    new Date(field.updatedAt)
                ]);
            }
            catch (err) {
                console.error(`Ошибка импорта поля ${field.name}:`, err);
            }
        }
        // Создание маппинга пользователей
        const userIdMap = {};
        const userResult = await client.query('SELECT id, email FROM users');
        for (const user of userResult.rows) {
            const originalUser = usersData.find(u => u.email === user.email);
            if (originalUser && originalUser._id) {
                userIdMap[originalUser._id] = user.id;
            }
        }
        // Импорт заявок
        const submissionsData = JSON.parse(fs.readFileSync(path.join(backupPath, 'submissions.json'), 'utf8'));
        console.log(`📥 Импорт ${submissionsData.length} заявок...`);
        for (const submission of submissionsData) {
            try {
                const newFormId = formIdMap[submission.formId] || formIdMap['6852ece595049e61337bb843']; // дефолтная форма
                const newUserId = userIdMap[submission.userId];
                if (!newFormId) {
                    console.log(`Пропуск заявки ${submission.submissionNumber} - форма не найдена`);
                    continue;
                }
                await client.query(`
                    INSERT INTO submissions (
                        submission_number, form_id, user_id, title, status,
                        priority, notes, tags, bitrix_deal_id, bitrix_category_id,
                        bitrix_sync_status, bitrix_sync_error, form_name, form_title,
                        user_email, user_name, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
                    ON CONFLICT (submission_number) DO NOTHING
                `, [
                    submission.submissionNumber,
                    newFormId,
                    newUserId || null,
                    submission.title,
                    submission.status,
                    submission.priority,
                    submission.notes || null,
                    submission.tags || [],
                    submission.bitrixDealId,
                    submission.bitrixCategoryId,
                    submission.bitrixSyncStatus,
                    submission.bitrixSyncError || null,
                    'form', // будет обновлено позже
                    'Form', // будет обновлено позже
                    null, // будет обновлено позже
                    null, // будет обновлено позже
                    new Date(submission.createdAt),
                    new Date(submission.updatedAt)
                ]);
            }
            catch (err) {
                console.error(`Ошибка импорта заявки ${submission.submissionNumber}:`, err);
            }
        }
        console.log('✅ Импорт завершен');
        await client.end();
    }
    catch (error) {
        console.error('❌ Ошибка импорта:', error);
        process.exit(1);
    }
}
// Запуск импорта
importBackupData().then(() => {
    console.log('🎉 Импорт успешно завершен');
    process.exit(0);
}).catch(error => {
    console.error('💥 Критическая ошибка:', error);
    process.exit(1);
});
