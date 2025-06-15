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
const mongoose_1 = __importDefault(require("mongoose"));
const Form_1 = __importDefault(require("../models/Form"));
const FormField_1 = __importDefault(require("../models/FormField"));
const Submission_1 = __importDefault(require("../models/Submission"));
const database_1 = __importDefault(require("../config/database"));
const cleanTestData = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🧹 Начинаем очистку тестовых данных...');
        // Подключаемся к базе данных
        yield (0, database_1.default)();
        console.log('✅ Подключен к MongoDB');
        // Удаляем все тестовые формы
        const deletedForms = yield Form_1.default.deleteMany({});
        console.log(`🗑️  Удалено форм: ${deletedForms.deletedCount}`);
        // Удаляем все поля форм
        const deletedFields = yield FormField_1.default.deleteMany({});
        console.log(`🗑️  Удалено полей форм: ${deletedFields.deletedCount}`);
        // Удаляем все заявки (опционально - оставьте если нужно сохранить реальные заявки)
        const deletedSubmissions = yield Submission_1.default.deleteMany({});
        console.log(`🗑️  Удалено заявок: ${deletedSubmissions.deletedCount}`);
        console.log('✅ Очистка тестовых данных завершена успешно!');
    }
    catch (error) {
        console.error('❌ Ошибка при очистке тестовых данных:', error);
    }
    finally {
        // Отключаемся от MongoDB
        yield mongoose_1.default.disconnect();
        console.log('🔌 Отключен от MongoDB');
        process.exit(0);
    }
});
// Запускаем скрипт
cleanTestData();
