"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
const dotenv_1 = __importDefault(require("dotenv"));
// Загружаем переменные окружения
dotenv_1.default.config();
const createTestUser = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Подключаемся к базе данных
        yield mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/beton-crm');
        console.log('✅ Подключение к MongoDB установлено');
        // Проверяем, есть ли уже тестовый пользователь
        const existingUser = yield User_1.default.findOne({ email: 'user@betonexpress.pro' });
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
        yield testUser.save();
        console.log('🎉 Тестовый пользователь создан успешно!');
        console.log('📧 Email: user@betonexpress.pro');
        console.log('🔑 Пароль: user123');
        console.log('👤 Роль: user');
    }
    catch (error) {
        console.error('❌ Ошибка создания тестового пользователя:', error);
    }
    finally {
        yield mongoose_1.default.disconnect();
        console.log('🔌 Отключение от MongoDB');
        process.exit(0);
    }
});
// Запускаем скрипт
createTestUser();
