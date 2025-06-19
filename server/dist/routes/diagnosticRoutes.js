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
const databaseValidation_1 = require("../utils/databaseValidation");
const adminMiddleware_1 = require("../middleware/adminMiddleware");
const router = express_1.default.Router();
/**
 * GET /api/diagnostic/database
 * Проверка целостности базы данных
 */
router.get('/database', adminMiddleware_1.adminMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const validation = yield (0, databaseValidation_1.validateFormFieldsIntegrity)();
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
}));
/**
 * POST /api/diagnostic/fix-database
 * Автоматическое исправление проблем в базе данных
 */
router.post('/fix-database', adminMiddleware_1.adminMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const fixResult = yield (0, databaseValidation_1.autoFixDatabaseIssues)();
        // Повторная проверка после исправлений
        const validationAfterFix = yield (0, databaseValidation_1.validateFormFieldsIntegrity)();
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
}));
/**
 * GET /api/diagnostic/health
 * Общая проверка состояния системы
 */
router.get('/health', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const validation = yield (0, databaseValidation_1.validateFormFieldsIntegrity)();
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
}));
exports.default = router;
