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
exports.submitForm = void 0;
const Form_1 = __importDefault(require("../models/Form"));
const bitrix24Service_1 = __importDefault(require("../services/bitrix24Service"));
// Обработка отправки формы заявки
const submitForm = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { formId, formData } = req.body;
        if (!formId || !formData) {
            return res.status(400).json({ message: 'Необходимо указать ID формы и данные формы' });
        }
        // Получаем форму с полями
        const form = yield Form_1.default.findById(formId).populate('fields');
        if (!form) {
            return res.status(404).json({ message: 'Форма не найдена' });
        }
        // Проверяем, активна ли форма
        if (!form.isActive) {
            return res.status(400).json({ message: 'Форма не активна' });
        }
        // Подготавливаем данные для создания сделки в Битрикс24
        const dealData = {};
        // Проходим по всем полям формы и заполняем данные для сделки
        for (const field of form.fields) {
            // Проверяем, есть ли значение для этого поля
            if (formData[field.name] !== undefined) {
                // Маппинг поля формы на поле Битрикс24
                dealData[field.bitrixFieldId] = formData[field.name];
            }
            else if (field.required) {
                // Если поле обязательное, но значение не предоставлено
                return res.status(400).json({ message: `Поле "${field.label}" обязательно для заполнения` });
            }
        }
        // Если указана категория сделки, устанавливаем её
        if (form.bitrixDealCategory) {
            dealData['CATEGORY_ID'] = form.bitrixDealCategory;
        }
        // Создаем сделку в Битрикс24
        const dealResponse = yield bitrix24Service_1.default.createDeal(dealData);
        // Возвращаем успешный ответ с ID созданной сделки
        res.status(200).json({
            success: true,
            message: form.successMessage || 'Спасибо! Ваша заявка успешно отправлена.',
            dealId: dealResponse.result,
        });
    }
    catch (error) {
        console.error('Ошибка при отправке формы:', error);
        res.status(500).json({ message: 'Произошла ошибка при обработке заявки', error: error.message });
    }
});
exports.submitForm = submitForm;
