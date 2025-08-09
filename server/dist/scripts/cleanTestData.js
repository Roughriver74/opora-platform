"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const Form_1 = __importDefault(require("../models/Form"));
const FormField_1 = __importDefault(require("../models/FormField"));
const Submission_1 = __importDefault(require("../models/Submission"));
const database_1 = __importDefault(require("../config/database"));
const cleanTestData = async () => {
    try {
        console.log('🧹 Начинаем очистку тестовых данных...');
        // Подключаемся к базе данных
        await (0, database_1.default)();
        console.log('✅ Подключен к MongoDB');
        // Удаляем все тестовые формы
        const deletedForms = await Form_1.default.deleteMany({});
        console.log(`🗑️  Удалено форм: ${deletedForms.deletedCount}`);
        // Удаляем все поля форм
        const deletedFields = await FormField_1.default.deleteMany({});
        console.log(`🗑️  Удалено полей форм: ${deletedFields.deletedCount}`);
        // Удаляем все заявки (опционально - оставьте если нужно сохранить реальные заявки)
        const deletedSubmissions = await Submission_1.default.deleteMany({});
        console.log(`🗑️  Удалено заявок: ${deletedSubmissions.deletedCount}`);
        console.log('✅ Очистка тестовых данных завершена успешно!');
    }
    catch (error) {
        console.error('❌ Ошибка при очистке тестовых данных:', error);
    }
    finally {
        // Отключаемся от MongoDB
        await mongoose_1.default.disconnect();
        console.log('🔌 Отключен от MongoDB');
        process.exit(0);
    }
};
// Запускаем скрипт
cleanTestData();
