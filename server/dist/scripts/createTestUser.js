"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const database_config_1 = require("../database/config/database.config");
const User_entity_1 = require("../database/entities/User.entity");
const bcrypt_1 = __importDefault(require("bcrypt"));
const dotenv_1 = __importDefault(require("dotenv"));
// Загружаем переменные окружения
dotenv_1.default.config();
const createTestUser = async () => {
    try {
        // Инициализируем TypeORM подключение
        await database_config_1.AppDataSource.initialize();
        const userRepository = database_config_1.AppDataSource.getRepository(User_entity_1.User);
        // Проверяем, есть ли уже тестовый пользователь
        const existingUser = await userRepository.findOne({
            where: { email: 'user@betonexpress.pro' }
        });
        if (existingUser) {
            process.exit(0);
        }
        // Создаем тестового пользователя
        const hashedPassword = await bcrypt_1.default.hash('user123', 10);
        const testUser = new User_entity_1.User();
        testUser.email = 'user@betonexpress.pro';
        testUser.password = hashedPassword;
        testUser.firstName = 'Тестовый';
        testUser.lastName = 'Пользователь';
        testUser.role = User_entity_1.UserRole.USER;
        testUser.isActive = true;
        testUser.status = User_entity_1.UserStatus.ACTIVE;
        await userRepository.save(testUser);
    }
    catch (error) {
        console.error('❌ Ошибка создания тестового пользователя:', error);
    }
    finally {
        await database_config_1.AppDataSource.destroy();
        process.exit(0);
    }
};
// Запускаем скрипт
createTestUser();
