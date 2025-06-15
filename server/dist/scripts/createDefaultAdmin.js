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
const createDefaultAdmin = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Подключаемся к базе данных
        // Пробуем разные варианты подключения
        const mongoUri = process.env.MONGODB_URI ||
            process.env.MONGO_URI ||
            'mongodb://localhost:27017/beton-crm';
        console.log('Попытка подключения к MongoDB...');
        console.log('URI:', mongoUri.replace(/\/\/.*@/, '//***:***@')); // Скрываем пароль в логах
        yield mongoose_1.default.connect(mongoUri);
        console.log('✅ Подключен к MongoDB');
        // Проверяем, существует ли уже админ
        const existingAdmin = yield User_1.default.findOne({
            email: 'crm@betonexpress.pro'
        });
        if (existingAdmin) {
            console.log('ℹ️  Админ crm@betonexpress.pro уже существует');
            console.log('✅ Email: crm@betonexpress.pro');
            console.log('✅ Пароль: Sacre.net13');
            return;
        }
        // Создаем нового админа (пароль будет захеширован автоматически в pre('save'))
        const admin = new User_1.default({
            email: 'crm@betonexpress.pro',
            password: 'Sacre.net13', // Передаем пароль в открытом виде
            role: 'admin',
            firstName: 'CRM',
            lastName: 'Administrator',
            phone: '',
            status: 'active'
        });
        yield admin.save();
        console.log('✅ Админ по умолчанию успешно создан!');
        console.log('📧 Email: crm@betonexpress.pro');
        console.log('🔑 Пароль: Sacre.net13');
        console.log('👤 Роль: admin');
        console.log('📊 Статус: active');
    }
    catch (error) {
        console.error('❌ Ошибка создания админа:', error);
        console.error('💡 Возможные причины:');
        console.error('   - Неправильный MONGODB_URI в .env файле');
        console.error('   - MongoDB сервер недоступен');
        console.error('   - Проблемы с сетевым подключением');
        console.error('');
        console.error('🔧 Для ручного создания выполните:');
        console.error('   cd /var/www/beton-crm/server');
        console.error('   npm run create-default-admin');
        // Не завершаем процесс с ошибкой, чтобы деплой продолжился
        process.exit(1);
    }
    finally {
        if (mongoose_1.default.connection.readyState === 1) {
            yield mongoose_1.default.disconnect();
            console.log('🔌 Отключен от MongoDB');
        }
    }
});
// Запускаем скрипт
createDefaultAdmin();
