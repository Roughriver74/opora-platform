"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
const dotenv_1 = __importDefault(require("dotenv"));
// Загружаем переменные окружения
dotenv_1.default.config();
const createTestUser = async () => {
    try {
        // Подключаемся к базе данных
        await mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/beton-crm');
        console.log('✅ Подключение к MongoDB установлено');
        // Проверяем, есть ли уже тестовый пользователь
        const existingUser = await User_1.default.findOne({ email: 'user@betonexpress.pro' });
        if (existingUser) {
            console.log('ℹ️  Тестовый пользователь уже существует');
            console.log('📧 Email: user@betonexpress.pro');
            console.log('🔑 Пароль: user123');
            process.exit(0);
        }
        // Создаем тестового пользователя
        const testUser = new User_1.default({
            email: 'user@betonexpress.pro',
            password: 'user123',
            firstName: 'Тестовый',
            lastName: 'Пользователь',
            role: 'user',
            isActive: true,
            status: 'active',
        });
        await testUser.save();
        console.log('🎉 Тестовый пользователь создан успешно!');
        console.log('📧 Email: user@betonexpress.pro');
        console.log('🔑 Пароль: user123');
        console.log('👤 Роль: user');
    }
    catch (error) {
        console.error('❌ Ошибка создания тестового пользователя:', error);
    }
    finally {
        await mongoose_1.default.disconnect();
        console.log('🔌 Отключение от MongoDB');
        process.exit(0);
    }
};
// Запускаем скрипт
createTestUser();
