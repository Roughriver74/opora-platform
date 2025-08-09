"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const databaseValidation_1 = require("../utils/databaseValidation");
const adminMiddleware_1 = require("../middleware/adminMiddleware");
const router = express_1.default.Router();
/**
 * GET /api/diagnostic/database
 * Проверка целостности базы данных
 */
router.get('/database', adminMiddleware_1.adminMiddleware, async (req, res) => {
    try {
        const validation = await (0, databaseValidation_1.validateFormFieldsIntegrity)();
        res.json({
            success: true,
            validation,
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
 * Автоматическое исправление проблем в базе данных
 */
router.post('/fix-database', adminMiddleware_1.adminMiddleware, async (req, res) => {
    try {
        const fixResult = await (0, databaseValidation_1.autoFixDatabaseIssues)();
        // Повторная проверка после исправлений
        const validationAfterFix = await (0, databaseValidation_1.validateFormFieldsIntegrity)();
        res.json({
            success: true,
            fixResult,
            validationAfterFix,
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
        const validation = await (0, databaseValidation_1.validateFormFieldsIntegrity)();
        const healthStatus = {
            database: validation.isValid ? 'healthy' : 'issues_detected',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            issues: validation.issues,
            statistics: validation.statistics,
        };
        const statusCode = validation.isValid ? 200 : 500;
        res.status(statusCode).json({
            success: validation.isValid,
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
