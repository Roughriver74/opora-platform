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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
// POST роуты для поиска (новые)
router.post('/bitrix/search/products', formFieldController.searchProducts);
router.post('/bitrix/search/companies', authMiddleware_1.authMiddleware, formFieldController.searchCompanies);
router.post('/bitrix/search/contacts', formFieldController.searchContacts);
// Обновление заголовка раздела (header поля)
router.put('/section/:id', authMiddleware_1.authMiddleware, authMiddleware_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { label } = req.body;
        const field = yield require('../models/FormField').default.findById(req.params.id);
        if (!field) {
            return res.status(404).json({ message: 'Поле не найдено' });
        }
        if (field.type !== 'header') {
            return res
                .status(400)
                .json({ message: 'Можно обновлять только заголовки разделов' });
        }
        field.label = label;
        yield field.save();
        res.json(field);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
}));
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
