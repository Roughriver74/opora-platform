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
const authMiddleware_1 = require("../middleware/authMiddleware");
const formController = __importStar(require("../controllers/formController"));
const router = (0, express_1.Router)();
// Получение категорий сделок из Битрикс24 - должен быть перед маршрутами с параметрами
router.get('/bitrix/deal-categories', formController.getDealCategories);
// Маршруты для управления формами
router.get('/', formController.getAllForms);
router.post('/', authMiddleware_1.authMiddleware, authMiddleware_1.requireAdmin, formController.createForm);
// Маршруты с параметрами - должны быть последними
router.get('/:id', formController.getFormById);
router.put('/:id', authMiddleware_1.authMiddleware, authMiddleware_1.requireAdmin, formController.updateForm);
router.delete('/:id', authMiddleware_1.authMiddleware, authMiddleware_1.requireAdmin, formController.deleteForm);
exports.default = router;
