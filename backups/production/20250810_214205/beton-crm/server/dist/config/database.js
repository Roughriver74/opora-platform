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
const config_1 = __importDefault(require("./config"));
const connectDB = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🔌 Попытка подключения к MongoDB...');
        console.log('URI:', config_1.default.mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Скрываем пароль
        yield mongoose_1.default.connect(config_1.default.mongoUri);
        console.log('✅ MongoDB подключена успешно');
        console.log('Database:', mongoose_1.default.connection.name);
        console.log('Host:', mongoose_1.default.connection.host);
        // Проверим количество пользователей в базе
        const User = mongoose_1.default.model('User');
        const userCount = yield User.countDocuments();
        console.log(`👥 Количество пользователей в базе: ${userCount}`);
    }
    catch (error) {
        console.error('❌ Ошибка подключения к MongoDB:', error);
        process.exit(1);
    }
});
exports.default = connectDB;
