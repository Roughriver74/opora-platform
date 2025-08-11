"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFormFieldUpdateRelation = exports.validateFormFieldRelation = void 0;
const database_config_1 = require("../database/config/database.config");
const Form_entity_1 = require("../database/entities/Form.entity");
const uuid_1 = require("uuid");
/**
 * Middleware для валидации связей между формами и полями
 */
const validateFormFieldRelation = async (req, res, next) => {
    try {
        const { formId } = req.body;
        // Если нет formId, пропускаем валидацию (поле может быть создано без связи)
        if (!formId) {
            next();
            return;
        }
        // Проверяем формат ID (теперь используем UUID)
        if (!(0, uuid_1.validate)(formId)) {
            res.status(400).json({
                message: 'Некорректный формат formId (ожидается UUID)',
                field: 'formId',
                received: formId,
            });
            return;
        }
        // Проверяем существование формы
        const formRepository = database_config_1.AppDataSource.getRepository(Form_entity_1.Form);
        const formExists = await formRepository.findOne({ where: { id: formId } });
        if (!formExists) {
            res.status(400).json({
                message: 'Форма с указанным ID не существует',
                field: 'formId',
                received: formId,
            });
            return;
        }
        // formId уже в правильном формате UUID
        req.body.formId = formId;
        console.log(`✅ Валидация связи: поле будет привязано к форме ${req.body.formId}`);
        next();
    }
    catch (error) {
        console.error('❌ Ошибка валидации связи:', error);
        res.status(500).json({
            message: 'Ошибка валидации связи с формой',
        });
    }
};
exports.validateFormFieldRelation = validateFormFieldRelation;
/**
 * Middleware для валидации при обновлении полей
 */
const validateFormFieldUpdateRelation = async (req, res, next) => {
    try {
        const { formId } = req.body;
        // Если formId не изменяется, пропускаем валидацию
        if (!formId) {
            next();
            return;
        }
        // Проверяем формат ID (используем UUID)
        if (!(0, uuid_1.validate)(formId)) {
            res.status(400).json({
                message: 'Некорректный формат formId при обновлении (ожидается UUID)',
                field: 'formId',
                received: formId,
            });
            return;
        }
        // Проверяем существование формы
        const formRepository = database_config_1.AppDataSource.getRepository(Form_entity_1.Form);
        const formExists = await formRepository.findOne({ where: { id: formId } });
        if (!formExists) {
            res.status(400).json({
                message: 'Форма с указанным ID не существует при обновлении',
                field: 'formId',
                received: formId,
            });
            return;
        }
        // formId уже в правильном формате UUID
        req.body.formId = formId;
        console.log(`✅ Валидация обновления: поле остается привязанным к форме ${req.body.formId}`);
        next();
    }
    catch (error) {
        console.error('❌ Ошибка валидации обновления связи:', error);
        res.status(500).json({
            message: 'Ошибка валидации обновления связи с формой',
        });
    }
};
exports.validateFormFieldUpdateRelation = validateFormFieldUpdateRelation;
