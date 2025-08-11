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
const passwordHash_1 = require("../utils/passwordHash");
const dotenv_1 = __importDefault(require("dotenv"));
// Загружаем переменные окружения
dotenv_1.default.config();
/**
 * Скрипт для создания администратора
 */
function createAdmin() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Подключаемся к базе данных
            const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/beton-crm';
            yield mongoose_1.default.connect(mongoUri);
            console.log('Подключение к MongoDB установлено');
            // Проверяем, есть ли уже админы
            const existingAdmin = yield User_1.default.findOne({ role: 'admin' });
            if (existingAdmin) {
                console.log('Администратор уже существует:', existingAdmin.email);
                process.exit(0);
            }
            // Получаем данные из переменных окружения или устанавливаем по умолчанию
            const adminEmail = process.env.ADMIN_EMAIL || 'admin@beton-crm.ru';
            const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
            const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Администратор';
            const adminLastName = process.env.ADMIN_LAST_NAME || 'Системы';
            // Валидируем пароль
            const passwordValidation = passwordHash_1.PasswordHashService.validatePassword(adminPassword);
            if (!passwordValidation.isValid) {
                console.error('Ошибка валидации пароля:', passwordValidation.message);
                process.exit(1);
            }
            // Создаем администратора
            const admin = new User_1.default({
                email: adminEmail,
                password: adminPassword, // будет автоматически хешироваться в pre-save хуке
                role: 'admin',
                firstName: adminFirstName,
                lastName: adminLastName,
                status: 'active'
            });
            yield admin.save();
            console.log('✅ Администратор успешно создан:');
            console.log(`Email: ${adminEmail}`);
            console.log(`Имя: ${adminFirstName} ${adminLastName}`);
            console.log(`Роль: ${admin.role}`);
            console.log(`ID: ${admin._id}`);
        }
        catch (error) {
            console.error('❌ Ошибка создания администратора:', error);
            process.exit(1);
        }
        finally {
            yield mongoose_1.default.disconnect();
            console.log('Отключение от MongoDB');
        }
    });
}
// Запускаем скрипт, если он вызван напрямую
if (require.main === module) {
    createAdmin();
}
exports.default = createAdmin;
