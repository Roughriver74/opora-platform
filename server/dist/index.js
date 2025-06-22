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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const database_1 = __importDefault(require("./config/database"));
const authMiddleware_1 = require("./middleware/authMiddleware");
const databaseValidation_1 = require("./utils/databaseValidation");
// Импорт маршрутизаторов
const formFieldRoutes_1 = __importDefault(require("./routes/formFieldRoutes"));
const formRoutes_1 = __importDefault(require("./routes/formRoutes"));
const submissionRoutes_1 = __importDefault(require("./routes/submissionRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const diagnosticRoutes_1 = __importDefault(require("./routes/diagnosticRoutes"));
const backupRoutes_1 = __importDefault(require("./routes/backupRoutes"));
// Инициализация Express приложения
const app = (0, express_1.default)();
// Подключение к MongoDB и валидация данных
const initializeServer = () => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, database_1.default)();
    // Проверяем целостность базы данных при запуске
    yield (0, databaseValidation_1.validateAndFixDatabase)(true); // autoFix = true для автоматического исправления
});
initializeServer();
// Middleware
// Простая настройка CORS для всех маршрутов
app.use((0, cors_1.default)({
    origin: '*', // Разрешаем запросы с любого источника (только для разработки)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
}));
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: true }));
// Применяем middleware авторизации для всех маршрутов
app.use(authMiddleware_1.authMiddleware);
// Маршруты API
app.use('/api/auth', authRoutes_1.default);
app.use('/api/form-fields', formFieldRoutes_1.default);
app.use('/api/forms', formRoutes_1.default);
app.use('/api/submissions', submissionRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/diagnostic', diagnosticRoutes_1.default);
app.use('/api/backups', backupRoutes_1.default);
// Базовый маршрут для проверки работоспособности API
app.get('/', (req, res) => {
    res.json({ message: 'Beton CRM API работает' });
});
// Запуск сервера
const PORT = process.env.PORT || 5001; // Используем порт из переменных окружения или 5001 по умолчанию
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
// Обработка необработанных ошибок
process.on('unhandledRejection', error => {
    console.error('Необработанная ошибка:', error);
});
exports.default = app;
