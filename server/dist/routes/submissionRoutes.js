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
const express_1 = __importDefault(require("express"));
const submissionController = __importStar(require("../controllers/submissionController"));
const optimizedSubmissionController_1 = require("../controllers/optimizedSubmissionController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Публичный роут для обновления статуса по Битрикс ID (без авторизации)
// Используется для внешних интеграций
router.get('/update-status', (req, res) => {
    submissionController.updateStatusByBitrixId(req, res);
});
// Публичный роут для проверки поля UF_CRM_1750107484181 в Битрикс24
router.get('/check-field/:dealId', (req, res) => {
    submissionController.checkBitrixField(req, res);
});
// Применяем middleware авторизации для всех роутов
router.use(authMiddleware_1.authMiddleware);
// Маршрут для отправки формы (доступен всем авторизованным)
router.post('/submit', (req, res) => {
    submissionController.submitForm(req, res);
});
// Получение всех заявок (только для админов)
router.get('/', authMiddleware_1.requireAdmin, (req, res) => {
    submissionController.getAllSubmissions(req, res);
});
// Получение заявок текущего пользователя (оптимизированная версия)
router.get('/my', authMiddleware_1.requireAuth, optimizedSubmissionController_1.getOptimizedUserSubmissions);
// Получение заявки по ID
router.get('/:id', authMiddleware_1.requireAuth, (req, res) => {
    submissionController.getSubmissionById(req, res);
});
// Получение заявки с актуальными данными из Битрикс24 для редактирования
router.get('/:id/edit', authMiddleware_1.requireAuth, (req, res) => {
    console.log(`[ROUTE EDIT] GET /:id/edit вызван для заявки ${req.params.id}`);
    console.log(`[ROUTE EDIT] Пользователь: ${req.user?.id}`);
    submissionController.getSubmissionWithBitrixData(req, res);
});
// Копирование заявки
router.post('/:id/copy', authMiddleware_1.requireAuth, (req, res) => {
    console.log(`[ROUTE COPY] POST /:id/copy вызван для заявки ${req.params.id}`);
    console.log(`[ROUTE COPY] Пользователь: ${req.user?.id}`);
    submissionController.copySubmission(req, res);
});
// Обновление статуса заявки
router.patch('/:id/status', authMiddleware_1.requireAuth, (req, res) => {
    submissionController.updateSubmissionStatus(req, res);
});
// Обновление заявки
router.put('/:id', authMiddleware_1.requireAuth, (req, res) => {
    submissionController.updateSubmission(req, res);
});
// Удаление заявки (только админы)
router.delete('/:id', authMiddleware_1.requireAdmin, (req, res) => {
    submissionController.deleteSubmission(req, res);
});
// Получение статусов из Битрикс24
router.get('/bitrix/stages/:categoryId', authMiddleware_1.requireAuth, (req, res) => {
    submissionController.getBitrixStages(req, res);
});
exports.default = router;
