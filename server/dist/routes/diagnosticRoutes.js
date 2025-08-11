"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adminMiddleware_1 = require("../middleware/adminMiddleware");
const database_config_1 = require("../database/config/database.config");
const router = express_1.default.Router();
/**
 * GET /api/diagnostic/database
 * Проверка целостности базы данных
 */
router.get('/database', adminMiddleware_1.adminMiddleware, async (req, res) => {
    try {
        // Простая проверка подключения к базе данных
        const isConnected = database_config_1.AppDataSource.isInitialized;
        res.json({
            success: true,
            validation: {
                isValid: isConnected,
                database: 'PostgreSQL',
                connection: isConnected ? 'active' : 'inactive'
            },
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Ошибка диагностики базы данных',
            error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        });
    }
});
/**
 * POST /api/diagnostic/fix-database
 * Автоматическое исправление проблем в базе данных (заглушка)
 */
router.post('/fix-database', adminMiddleware_1.adminMiddleware, async (req, res) => {
    try {
        res.json({
            success: true,
            fixResult: {
                message: 'PostgreSQL database is managed by migrations',
                recommendation: 'Run migrations if needed'
            },
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Ошибка исправления базы данных',
            error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        });
    }
});
/**
 * GET /api/diagnostic/health
 * Общая проверка состояния системы
 */
router.get('/health', async (req, res) => {
    try {
        const isConnected = database_config_1.AppDataSource.isInitialized;
        const healthStatus = {
            database: isConnected ? 'healthy' : 'disconnected',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            connection: isConnected ? 'active' : 'inactive',
        };
        const statusCode = isConnected ? 200 : 500;
        res.status(statusCode).json({
            success: isConnected,
            health: healthStatus,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            health: {
                database: 'error',
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Неизвестная ошибка',
            },
        });
    }
});
exports.default = router;
