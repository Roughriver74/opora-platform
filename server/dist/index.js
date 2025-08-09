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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const database_config_1 = require("./database/config/database.config");
const redis_1 = __importDefault(require("./config/redis"));
const authMiddleware_1 = require("./middleware/authMiddleware");
const dotenv_1 = __importDefault(require("dotenv"));
// Импорт маршрутизаторов
const formFieldRoutes_1 = __importDefault(require("./routes/formFieldRoutes"));
const formRoutes_1 = __importDefault(require("./routes/formRoutes"));
const submissionRoutes_1 = __importDefault(require("./routes/submissionRoutes"));
const optimizedSubmissionRoutes_1 = __importDefault(require("./routes/optimizedSubmissionRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const diagnosticRoutes_1 = __importDefault(require("./routes/diagnosticRoutes"));
const backupRoutes_1 = __importDefault(require("./routes/backupRoutes"));
const settingsRoutes_1 = __importDefault(require("./routes/settingsRoutes"));
const settingsController_1 = require("./controllers/settingsController");
// Загрузка переменных окружения
dotenv_1.default.config();
// Инициализация Express приложения
const app = (0, express_1.default)();
// Подключение к PostgreSQL и инициализация
const initializeServer = async () => {
    try {
        // Инициализация PostgreSQL
        await (0, database_config_1.initializeDatabase)();
        console.log('✅ PostgreSQL подключен');
        // Redis временно отключен для стабильной работы
        // await redisClient.connect()
        // Инициализация настроек
        await (0, settingsController_1.initializeDefaultSettings)();
        console.log('✅ Настройки инициализированы');
    }
    catch (error) {
        console.error('❌ Ошибка инициализации сервера:', error);
        process.exit(1);
    }
};
// Запуск инициализации
initializeServer();
// Middleware
// Настройка CORS
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        // Разрешаем запросы с указанного origin и без origin (для Postman и т.д.)
        const allowedOrigins = corsOrigin.split(',').map(o => o.trim());
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 200,
}));
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: true }));
// Маршруты авторизации (без middleware)
app.use('/api/auth', authRoutes_1.default);
// Применяем middleware авторизации для остальных маршрутов
app.use(authMiddleware_1.authMiddleware);
// Остальные маршруты API
app.use('/api/form-fields', formFieldRoutes_1.default);
app.use('/api/forms', formRoutes_1.default);
app.use('/api/submissions', submissionRoutes_1.default);
app.use('/api/submissions', optimizedSubmissionRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/diagnostic', diagnosticRoutes_1.default);
app.use('/api/backups', backupRoutes_1.default);
app.use('/api/settings', settingsRoutes_1.default);
// Базовый маршрут для проверки работоспособности API
app.get('/', (req, res) => {
    res.json({
        message: 'Beton CRM API работает',
        database: 'PostgreSQL',
        version: '2.0.0'
    });
});
// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        // Проверка подключения к БД
        const dbConnected = await checkDatabaseConnection();
        res.json({
            status: 'ok',
            database: dbConnected ? 'connected' : 'disconnected',
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(503).json({
            status: 'error',
            error: error.message
        });
    }
});
// Функция проверки подключения к БД
async function checkDatabaseConnection() {
    try {
        const { AppDataSource } = await Promise.resolve().then(() => __importStar(require('./database/config/database.config')));
        return AppDataSource.isInitialized;
    }
    catch {
        return false;
    }
}
// Запуск сервера
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM сигнал получен: закрытие HTTP сервера');
    server.close(async () => {
        console.log('HTTP сервер закрыт');
        // Закрытие подключения к БД
        await (0, database_config_1.closeDatabaseConnection)();
        // Закрытие Redis если подключен
        if (redis_1.default && redis_1.default.isConnected()) {
            await redis_1.default.disconnect();
        }
        process.exit(0);
    });
});
// Обработка необработанных ошибок
process.on('unhandledRejection', (error) => {
    console.error('Необработанная ошибка:', error);
    // В production можно отправлять в систему мониторинга
});
process.on('uncaughtException', (error) => {
    console.error('Необработанное исключение:', error);
    // Критическая ошибка - перезапускаем процесс
    process.exit(1);
});
exports.default = app;
