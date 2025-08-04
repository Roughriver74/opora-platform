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
const config_1 = __importDefault(require("../config/config"));
const redis_1 = __importDefault(require("../config/redis"));
const Submission_1 = __importDefault(require("../models/Submission"));
const optimizedSubmissionService_1 = require("../services/optimizedSubmissionService");
/**
 * Скрипт для тестирования производительности после оптимизации
 */
function connectToDatabase() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield mongoose_1.default.connect(config_1.default.mongoUri);
            console.log('✅ Подключение к MongoDB успешно');
            // Подключаемся к Redis
            yield redis_1.default.connect();
            console.log('✅ Подключение к Redis успешно');
        }
        catch (error) {
            console.error('❌ Ошибка подключения к базам данных:', error);
            throw error;
        }
    });
}
function measureQueryTime(name, queryFn) {
    return __awaiter(this, void 0, void 0, function* () {
        const startTime = Date.now();
        const result = yield queryFn();
        const endTime = Date.now();
        const duration = endTime - startTime;
        console.log(`⏱️  ${name}: ${duration}ms`);
        return result;
    });
}
function testPerformance() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🚀 Начинаем тестирование производительности...\n');
        // 1. Тестируем старые методы (с populate)
        console.log('📊 СТАРЫЕ МЕТОДЫ (с populate):');
        const oldMethod1 = yield measureQueryTime('Получение 20 заявок с populate', () => __awaiter(this, void 0, void 0, function* () {
            return yield Submission_1.default.find({})
                .populate('formId', 'name title')
                .populate('userId', 'email firstName lastName')
                .populate('assignedTo', 'email firstName lastName')
                .limit(20)
                .sort({ createdAt: -1 });
        }));
        const oldMethod2 = yield measureQueryTime('Поиск заявок с populate', () => __awaiter(this, void 0, void 0, function* () {
            return yield Submission_1.default.find({
                $or: [
                    { submissionNumber: { $regex: 'test', $options: 'i' } },
                    { title: { $regex: 'test', $options: 'i' } }
                ]
            })
                .populate('formId', 'name title')
                .populate('userId', 'email firstName lastName')
                .limit(10);
        }));
        // 2. Тестируем новые методы (оптимизированные)
        console.log('\n📊 НОВЫЕ МЕТОДЫ (оптимизированные):');
        const newMethod1 = yield measureQueryTime('Получение 20 заявок без populate', () => __awaiter(this, void 0, void 0, function* () {
            return yield optimizedSubmissionService_1.optimizedSubmissionService.getSubmissions({}, {
                page: 1,
                limit: 20,
                sortBy: 'createdAt',
                sortOrder: 'desc'
            });
        }));
        const newMethod2 = yield measureQueryTime('Поиск заявок без populate', () => __awaiter(this, void 0, void 0, function* () {
            return yield optimizedSubmissionService_1.optimizedSubmissionService.getSubmissions({
                search: 'test'
            }, {
                page: 1,
                limit: 10,
                sortBy: 'createdAt',
                sortOrder: 'desc'
            });
        }));
        // 3. Тестируем статистику
        console.log('\n📊 СТАТИСТИКА И ОТЧЕТЫ:');
        const stats = yield measureQueryTime('Получение статистики', () => __awaiter(this, void 0, void 0, function* () {
            return yield optimizedSubmissionService_1.optimizedSubmissionService.getSubmissionStats({});
        }));
        // 4. Тестируем индексы
        console.log('\n📊 ТЕСТИРОВАНИЕ ИНДЕКСОВ:');
        const indexTest1 = yield measureQueryTime('Поиск по статусу + дате (индекс)', () => __awaiter(this, void 0, void 0, function* () {
            return yield Submission_1.default.find({
                status: 'NEW',
                createdAt: { $gte: new Date('2024-01-01') }
            }).limit(10);
        }));
        const indexTest2 = yield measureQueryTime('Поиск по денормализованному полю', () => __awaiter(this, void 0, void 0, function* () {
            return yield Submission_1.default.find({
                userEmail: { $regex: '@', $options: 'i' }
            }).limit(10);
        }));
        // 5. Результаты
        console.log('\n📈 СВОДКА РЕЗУЛЬТАТОВ:');
        console.log(`Старый метод 1: ${oldMethod1.length} записей`);
        console.log(`Новый метод 1: ${newMethod1.data.length} записей`);
        console.log(`Старый метод 2: ${oldMethod2.length} записей`);
        console.log(`Новый метод 2: ${newMethod2.data.length} записей`);
        console.log(`Статистика: ${JSON.stringify(stats, null, 2)}`);
        console.log(`Индекс тест 1: ${indexTest1.length} записей`);
        console.log(`Индекс тест 2: ${indexTest2.length} записей`);
        // 6. Проверяем состояние кэша
        console.log('\n💾 СОСТОЯНИЕ КЭША:');
        console.log(`Redis подключен: ${redis_1.default.isConnected()}`);
        // Тестируем кэширование Битрикс24
        const { bitrixCache } = require('../services/cacheService');
        const cachedCategories = yield bitrixCache.getDealCategories();
        console.log(`Кэш категорий Битрикс24: ${cachedCategories ? 'Есть' : 'Пусто'}`);
        console.log('\n✅ Тестирование завершено!');
    });
}
function updateExistingData() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🔄 Обновление существующих заявок с денормализованными данными...');
        const count = yield optimizedSubmissionService_1.optimizedSubmissionService.updateDenormalizedData();
        console.log(`✅ Обновлено ${count} заявок`);
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield connectToDatabase();
            // Обновляем существующие данные
            yield updateExistingData();
            // Тестируем производительность
            yield testPerformance();
        }
        catch (error) {
            console.error('❌ Ошибка при тестировании:', error);
        }
        finally {
            yield mongoose_1.default.disconnect();
            yield redis_1.default.disconnect();
            console.log('👋 Отключение от баз данных');
        }
    });
}
// Запускаем тест
if (require.main === module) {
    main();
}
