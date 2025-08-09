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
const pg_1 = require("pg");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
async function verifyImport() {
    const client = new pg_1.Client({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });
    try {
        await client.connect();
        console.log('🔍 Проверка импортированных данных...\n');
        // Проверка пользователей
        const usersCount = await client.query('SELECT COUNT(*) FROM users');
        console.log(`✅ Пользователи: ${usersCount.rows[0].count}`);
        // Проверка форм
        const formsCount = await client.query('SELECT COUNT(*) FROM forms');
        console.log(`✅ Формы: ${formsCount.rows[0].count}`);
        // Проверка полей форм
        const fieldsCount = await client.query('SELECT COUNT(*) FROM form_fields');
        console.log(`✅ Поля форм: ${fieldsCount.rows[0].count}`);
        // Проверка заявок
        const submissionsCount = await client.query('SELECT COUNT(*) FROM submissions');
        console.log(`✅ Заявки: ${submissionsCount.rows[0].count}`);
        // Примеры данных
        console.log('\n📋 Примеры данных:');
        const sampleUsers = await client.query('SELECT email, first_name, last_name, role FROM users LIMIT 3');
        console.log('\nПользователи:');
        sampleUsers.rows.forEach(user => {
            console.log(`  - ${user.email} (${user.first_name} ${user.last_name}) - ${user.role}`);
        });
        const sampleForms = await client.query('SELECT name, title FROM forms');
        console.log('\nФормы:');
        sampleForms.rows.forEach(form => {
            console.log(`  - ${form.name}: ${form.title}`);
        });
        await client.end();
    }
    catch (error) {
        console.error('❌ Ошибка:', error);
    }
}
verifyImport();
