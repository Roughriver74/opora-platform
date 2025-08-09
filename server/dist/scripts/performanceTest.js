"use strict";
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
async function connectToDatabase() {
    try {
        await mongoose_1.default.connect(config_1.default.mongoUri);
        console.log('✅ Подключение к MongoDB успешно');
        // Подключаемся к Redis
        await redis_1.default.connect();
        console.log('✅ Подключение к Redis успешно');
    }
    catch (error) {
        console.error('❌ Ошибка подключения к базам данных:', error);
        throw error;
    }
}
async function measureQueryTime(name, queryFn) {
    const startTime = Date.now();
    const result = await queryFn();
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`⏱️  ${name}: ${duration}ms`);
    return result;
}
async function testPerformance() {
    console.log('🚀 Начинаем тестирование производительности...\n');
    // 1. Тестируем старые методы (с populate)
    console.log('📊 СТАРЫЕ МЕТОДЫ (с populate):');
    const oldMethod1 = await measureQueryTime('Получение 20 заявок с populate', async () => {
        return await Submission_1.default.find({})
            .populate('formId', 'name title')
            .populate('userId', 'email firstName lastName')
            .populate('assignedTo', 'email firstName lastName')
            .limit(20)
            .sort({ createdAt: -1 });
    });
    const oldMethod2 = await measureQueryTime('Поиск заявок с populate', async () => {
        return await Submission_1.default.find({
            $or: [
                { submissionNumber: { $regex: 'test', $options: 'i' } },
                { title: { $regex: 'test', $options: 'i' } }
            ]
        })
            .populate('formId', 'name title')
            .populate('userId', 'email firstName lastName')
            .limit(10);
    });
    // 2. Тестируем новые методы (оптимизированные)
    console.log('\n📊 НОВЫЕ МЕТОДЫ (оптимизированные):');
    const newMethod1 = await measureQueryTime('Получение 20 заявок без populate', async () => {
        return await optimizedSubmissionService_1.optimizedSubmissionService.getSubmissions({}, {
            page: 1,
            limit: 20,
            sortBy: 'createdAt',
            sortOrder: 'desc'
        });
    });
    const newMethod2 = await measureQueryTime('Поиск заявок без populate', async () => {
        return await optimizedSubmissionService_1.optimizedSubmissionService.getSubmissions({
            search: 'test'
        }, {
            page: 1,
            limit: 10,
            sortBy: 'createdAt',
            sortOrder: 'desc'
        });
    });
    // 3. Тестируем статистику
    console.log('\n📊 СТАТИСТИКА И ОТЧЕТЫ:');
    const stats = await measureQueryTime('Получение статистики', async () => {
        return await optimizedSubmissionService_1.optimizedSubmissionService.getSubmissionStats({});
    });
    // 4. Тестируем индексы
    console.log('\n📊 ТЕСТИРОВАНИЕ ИНДЕКСОВ:');
    const indexTest1 = await measureQueryTime('Поиск по статусу + дате (индекс)', async () => {
        return await Submission_1.default.find({
            status: 'NEW',
            createdAt: { $gte: new Date('2024-01-01') }
        }).limit(10);
    });
    const indexTest2 = await measureQueryTime('Поиск по денормализованному полю', async () => {
        return await Submission_1.default.find({
            userEmail: { $regex: '@', $options: 'i' }
        }).limit(10);
    });
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
    const cachedCategories = await bitrixCache.getDealCategories();
    console.log(`Кэш категорий Битрикс24: ${cachedCategories ? 'Есть' : 'Пусто'}`);
    console.log('\n✅ Тестирование завершено!');
}
async function updateExistingData() {
    console.log('🔄 Обновление существующих заявок с денормализованными данными...');
    const count = await optimizedSubmissionService_1.optimizedSubmissionService.updateDenormalizedData();
    console.log(`✅ Обновлено ${count} заявок`);
}
async function main() {
    try {
        await connectToDatabase();
        // Обновляем существующие данные
        await updateExistingData();
        // Тестируем производительность
        await testPerformance();
    }
    catch (error) {
        console.error('❌ Ошибка при тестировании:', error);
    }
    finally {
        await mongoose_1.default.disconnect();
        await redis_1.default.disconnect();
        console.log('👋 Отключение от баз данных');
    }
}
// Запускаем тест
if (require.main === module) {
    main();
}
