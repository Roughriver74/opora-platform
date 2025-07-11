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
const formFieldController = __importStar(require("../controllers/formFieldController"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Получение всех полей
router.get('/', formFieldController.getAllFields);
router.post('/', authMiddleware_1.authMiddleware, authMiddleware_1.requireAdmin, formFieldController.createField);
// Битрикс маршруты - должны быть перед маршрутами с параметрами
// Получение полей из Битрикс24
router.get('/bitrix/fields', formFieldController.getBitrixFields);
// Получение продуктов из каталога Битрикс24
router.get('/bitrix/products', formFieldController.getProductsList);
// Получение списка компаний из Битрикс24 (требует аутентификации для фильтрации)
router.get('/bitrix/companies', authMiddleware_1.authMiddleware, formFieldController.getCompaniesList);
// Получение списка контактов из Битрикс24
router.get('/bitrix/contacts', formFieldController.getContactsList);
// Получение пользовательских полей из Битрикс24
router.get('/bitrix/userfields', formFieldController.getUserFields);
// Получение значений для конкретного поля типа enumeration
router.get('/bitrix/enumvalues/:fieldId', formFieldController.getEnumFieldValues);
// Получение всех полей типа enumeration с их значениями
router.get('/bitrix/enum-fields-with-values', formFieldController.getAllEnumFieldsWithValues);
// Отладочный метод для исследования структуры полей (только для разработки)
router.get('/bitrix/debug-fields', formFieldController.debugFieldStructure);
// Маршруты с параметрами должны идти последними
router.get('/:id', formFieldController.getFieldById);
router.put('/:id', authMiddleware_1.authMiddleware, authMiddleware_1.requireAdmin, formFieldController.updateField);
router.delete('/:id', authMiddleware_1.authMiddleware, authMiddleware_1.requireAdmin, formFieldController.deleteField);
exports.default = router;
