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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const formController = __importStar(require("../controllers/formController"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Получение всех форм
router.get('/', formController.getAllForms);
// Создание новой формы
router.post('/', authMiddleware_1.authMiddleware, authMiddleware_1.requireAdmin, formController.createForm);
// Получение категорий сделок из Битрикс24
router.get('/bitrix/deal-categories', formController.getDealCategories);
// Получение статусов сделок из Битрикс24
router.get('/bitrix/deal-stages', formController.getDealStages);
// Тестирование подключения к Битрикс24
router.get('/bitrix/test-connection', authMiddleware_1.authMiddleware, authMiddleware_1.requireAdmin, formController.testConnection);
// Тестирование синхронизации с Битрикс24
router.post('/bitrix/test-sync', authMiddleware_1.authMiddleware, authMiddleware_1.requireAdmin, formController.testSync);
// Получение формы по ID
router.get('/:id', formController.getFormById);
// Обновление формы
router.put('/:id', authMiddleware_1.authMiddleware, authMiddleware_1.requireAdmin, formController.updateForm);
// Удаление формы
router.delete('/:id', authMiddleware_1.authMiddleware, authMiddleware_1.requireAdmin, formController.deleteForm);
// Обработка отправки формы (публичный endpoint)
router.post('/:id/submit', formController.submitForm);
exports.default = router;
