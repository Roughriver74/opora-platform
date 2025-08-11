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
exports.validateFormFieldUpdateRelation = exports.validateFormFieldRelation = void 0;
const Form_1 = __importDefault(require("../models/Form"));
const database_1 = require("../types/database");
/**
 * Middleware для валидации связей между формами и полями
 */
const validateFormFieldRelation = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { formId } = req.body;
        // Если нет formId, пропускаем валидацию (поле может быть создано без связи)
        if (!formId) {
            next();
            return;
        }
        // Проверяем формат ID
        if (!database_1.DatabaseIdUtils.isValidObjectId(formId)) {
            res.status(400).json({
                message: 'Некорректный формат formId',
                field: 'formId',
                received: formId,
            });
            return;
        }
        // Проверяем существование формы
        const formExists = yield Form_1.default.findById(formId);
        if (!formExists) {
            res.status(400).json({
                message: 'Форма с указанным ID не существует',
                field: 'formId',
                received: formId,
            });
            return;
        }
        // Приводим formId к строке для консистентности
        req.body.formId = database_1.DatabaseIdUtils.toString(formId);
        console.log(`✅ Валидация связи: поле будет привязано к форме ${req.body.formId}`);
        next();
    }
    catch (error) {
        console.error('❌ Ошибка валидации связи:', error);
        res.status(500).json({
            message: 'Ошибка валидации связи с формой',
        });
    }
});
exports.validateFormFieldRelation = validateFormFieldRelation;
/**
 * Middleware для валидации при обновлении полей
 */
const validateFormFieldUpdateRelation = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { formId } = req.body;
        // Если formId не изменяется, пропускаем валидацию
        if (!formId) {
            next();
            return;
        }
        // Аналогичная валидация для обновления
        if (!database_1.DatabaseIdUtils.isValidObjectId(formId)) {
            res.status(400).json({
                message: 'Некорректный формат formId при обновлении',
                field: 'formId',
                received: formId,
            });
            return;
        }
        const formExists = yield Form_1.default.findById(formId);
        if (!formExists) {
            res.status(400).json({
                message: 'Форма с указанным ID не существует при обновлении',
                field: 'formId',
                received: formId,
            });
            return;
        }
        req.body.formId = database_1.DatabaseIdUtils.toString(formId);
        console.log(`✅ Валидация обновления: поле остается привязанным к форме ${req.body.formId}`);
        next();
    }
    catch (error) {
        console.error('❌ Ошибка валидации обновления связи:', error);
        res.status(500).json({
            message: 'Ошибка валидации обновления связи с формой',
        });
    }
});
exports.validateFormFieldUpdateRelation = validateFormFieldUpdateRelation;
