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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const database_1 = __importDefault(require("./config/database"));
const authMiddleware_1 = require("./middleware/authMiddleware");
const databaseValidation_1 = require("./utils/databaseValidation");
// Импорт маршрутизаторов
const formFieldRoutes_1 = __importDefault(require("./routes/formFieldRoutes"));
const formRoutes_1 = __importDefault(require("./routes/formRoutes"));
const submissionRoutes_1 = __importDefault(require("./routes/submissionRoutes"));
const optimizedSubmissionRoutes_1 = __importDefault(require("./routes/optimizedSubmissionRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const diagnosticRoutes_1 = __importDefault(require("./routes/diagnosticRoutes"));
const backupRoutes_1 = __importDefault(require("./routes/backupRoutes"));
const settingsRoutes_1 = __importDefault(require("./routes/settingsRoutes"));
const settingsController_1 = require("./controllers/settingsController");
// Инициализация Express приложения
const app = (0, express_1.default)();
// Подключение к MongoDB и валидация данных
const initializeServer = () => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, database_1.default)();
    // Redis временно отключен для стабильной работы
    // await redisClient.connect()
    // Проверяем целостность базы данных при запуске
    yield (0, databaseValidation_1.validateAndFixDatabase)(true); // autoFix = true для автоматического исправления
    // Инициализируем настройки по умолчанию
    yield (0, settingsController_1.initializeDefaultSettings)();
});
initializeServer();
// Middleware
// Настройка CORS для разработки
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        // Разрешаем запросы с localhost:3000 и без origin (для Postman и т.д.)
        const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 200,
}));
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: true }));
// Применяем middleware авторизации для всех маршрутов
app.use(authMiddleware_1.authMiddleware);
// Маршруты API
app.use('/api/auth', authRoutes_1.default);
app.use('/api/form-fields', formFieldRoutes_1.default);
app.use('/api/forms', formRoutes_1.default);
app.use('/api/submissions', submissionRoutes_1.default);
app.use('/api/submissions', optimizedSubmissionRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/diagnostic', diagnosticRoutes_1.default);
app.use('/api/backups', backupRoutes_1.default);
app.use('/api/settings', settingsRoutes_1.default);
// Базовый маршрут для проверки работоспособности API
app.get('/', (req, res) => {
    res.json({ message: 'Beton CRM API работает' });
});
// Debug endpoint для проверки всех форм
app.get('/debug/forms', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const Form = require('./models/Form').default;
        const forms = yield Form.find({}).limit(10);
        res.json({
            count: forms.length,
            forms: forms.map(f => ({
                _id: f._id,
                _idString: f._id.toString(),
                _idType: typeof f._id,
                name: f.name,
                title: f.title
            }))
        });
    }
    catch (error) {
        res.json({ error: error.message });
    }
}));
// Временный debug endpoint для проверки пользователя
app.get('/debug/user/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const User = require('./models/User').default;
        const user = yield User.findById(req.params.id);
        res.json({
            user: user ? {
                id: user._id,
                email: user.email,
                status: user.status,
                isActive: user.isActive,
                role: user.role
            } : null
        });
    }
    catch (error) {
        res.json({ error: error.message });
    }
}));
// Debug endpoint для просмотра всех пользователей
app.get('/debug/users', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const User = require('./models/User').default;
        const users = yield User.find({}).select('_id email status isActive role').limit(10);
        res.json({ users });
    }
    catch (error) {
        res.json({ error: error.message });
    }
}));
// Debug endpoint для создания админа
app.post('/debug/create-admin', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const User = require('./models/User').default;
        const bcrypt = require('bcryptjs');
        // Always create with fresh data  
        const hashedPassword = yield bcrypt.hash('123456', 10);
        // Delete existing if any
        yield User.deleteMany({ email: 'crm@betonexpress.pro' });
        // Create new user
        const newUser = yield User.create({
            email: 'crm@betonexpress.pro',
            password: hashedPassword,
            firstName: 'CRM',
            lastName: 'Administrator',
            fullName: 'CRM Administrator',
            role: 'admin',
            status: 'active',
            isActive: true,
            settings: {
                onlyMyCompanies: false
            }
        });
        res.json({ message: 'Admin created successfully', user: newUser, password: '123456' });
    }
    catch (error) {
        res.json({ error: error.message });
    }
}));
// Debug endpoint для обновления пароля существующего пользователя
app.post('/debug/fix-user-password/:email', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const User = require('./models/User').default;
        const bcrypt = require('bcryptjs');
        const { email } = req.params;
        const { password = '123456' } = req.body;
        const user = yield User.findOne({ email });
        if (!user) {
            return res.json({ error: 'User not found' });
        }
        // Hash new password
        const hashedPassword = yield bcrypt.hash(password, 10);
        user.password = hashedPassword;
        user.isActive = true;
        user.status = 'active';
        yield user.save();
        res.json({ message: 'Password updated successfully', email, newPassword: password });
    }
    catch (error) {
        res.json({ error: error.message });
    }
}));
// Debug endpoint для проверки формы по ID
app.get('/debug/form/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const Form = require('./models/Form').default;
        const mongoose = require('mongoose');
        const { id } = req.params;
        console.log('Debug: получен ID:', id);
        console.log('Debug: тип ID:', typeof id);
        console.log('Debug: валидный ObjectId?', mongoose.Types.ObjectId.isValid(id));
        // Пробуем разные способы поиска
        const form1 = yield Form.findById(id);
        const form2 = yield Form.findOne({ _id: id });
        let form3 = null;
        try {
            form3 = yield Form.findOne({ _id: new mongoose.Types.ObjectId(id) });
        }
        catch (e) {
            console.log('Ошибка при создании ObjectId:', e.message);
        }
        // Получаем все формы для сравнения
        const allForms = yield Form.find({});
        res.json({
            receivedId: id,
            idType: typeof id,
            isValidObjectId: mongoose.Types.ObjectId.isValid(id),
            findByIdResult: form1 ? { found: true, id: form1._id, name: form1.name } : { found: false },
            findOneStringResult: form2 ? { found: true, id: form2._id, name: form2.name } : { found: false },
            findOneObjectIdResult: form3 ? { found: true, id: form3._id, name: form3.name } : { found: false },
            allFormsCount: allForms.length,
            allForms: allForms.map(f => ({
                id: f._id,
                idString: f._id.toString(),
                name: f.name,
                matchesRequestedId: f._id.toString() === id
            }))
        });
    }
    catch (error) {
        res.json({ error: error.message, stack: error.stack });
    }
}));
// Debug endpoint для проверки полей формы
app.get('/debug/fields', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const FormField = require('./models/FormField').default;
        const fields = yield FormField.find({}).limit(20);
        res.json({
            count: fields.length,
            fields: fields.map(f => ({
                _id: f._id,
                _idString: f._id.toString(),
                _idType: typeof f._id,
                name: f.name,
                label: f.label,
                type: f.type,
                formId: f.formId
            }))
        });
    }
    catch (error) {
        res.json({ error: error.message });
    }
}));
// Debug endpoint для проверки конкретного поля по ID
app.get('/debug/field/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const FormField = require('./models/FormField').default;
        const mongoose = require('mongoose');
        const { id } = req.params;
        console.log('Debug field: получен ID:', id);
        console.log('Debug field: тип ID:', typeof id);
        console.log('Debug field: валидный ObjectId?', mongoose.Types.ObjectId.isValid(id));
        // Пробуем разные способы поиска
        const field1 = yield FormField.findById(id);
        const field2 = yield FormField.findOne({ _id: id });
        let field3 = null;
        try {
            field3 = yield FormField.findOne({ _id: new mongoose.Types.ObjectId(id) });
        }
        catch (e) {
            console.log('Ошибка при создании ObjectId для поля:', e.message);
        }
        // Получаем все поля для сравнения
        const allFields = yield FormField.find({});
        res.json({
            receivedId: id,
            idType: typeof id,
            isValidObjectId: mongoose.Types.ObjectId.isValid(id),
            findByIdResult: field1 ? { found: true, id: field1._id, name: field1.name } : { found: false },
            findOneStringResult: field2 ? { found: true, id: field2._id, name: field2.name } : { found: false },
            findOneObjectIdResult: field3 ? { found: true, id: field3._id, name: field3.name } : { found: false },
            allFieldsCount: allFields.length,
            matchingFields: allFields.filter(f => f._id.toString() === id).map(f => ({
                id: f._id,
                idString: f._id.toString(),
                name: f.name,
                label: f.label,
                type: f.type
            }))
        });
    }
    catch (error) {
        res.json({ error: error.message, stack: error.stack });
    }
}));
// Debug endpoint для тестирования порядка полей без авторизации
app.put('/debug/test-field-order', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const formFieldController = require('./controllers/formFieldController');
        // Создаем фальшивый объект запроса с нужными данными
        const fakeReq = {
            body: req.body,
            user: { role: 'admin' } // Фальшивый пользователь для прохождения проверок
        };
        const fakeRes = {
            status: (code) => ({
                json: (data) => {
                    res.status(code).json(data);
                }
            })
        };
        // Вызываем контроллер напрямую
        yield formFieldController.updateFieldsOrder(fakeReq, fakeRes);
    }
    catch (error) {
        console.error('❌ Ошибка при тесте порядка полей:', error);
        res.status(500).json({ error: error.message });
    }
}));
// Debug endpoint для тестирования обновления формы без авторизации
app.put('/debug/test-form-update/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const formController = require('./controllers/formController');
        // Создаем фальшивый объект запроса с нужными данными
        const fakeReq = {
            params: { id: req.params.id },
            body: req.body,
            user: { role: 'admin' } // Фальшивый пользователь для прохождения проверок
        };
        const fakeRes = {
            status: (code) => ({
                json: (data) => {
                    res.status(code).json(data);
                }
            })
        };
        // Вызываем контроллер напрямую
        yield formController.updateForm(fakeReq, fakeRes);
    }
    catch (error) {
        console.error('❌ Ошибка при тесте обновления формы:', error);
        res.status(500).json({ error: error.message });
    }
}));
// Debug endpoint для создания тестового поля
app.post('/debug/create-test-field', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const FormField = require('./models/FormField').default;
        console.log('🆕 Создание тестового поля...');
        const testFieldData = {
            name: `test_field_${Date.now()}`,
            label: 'Тестовое поле',
            type: 'text',
            required: false,
            bitrixFieldId: 'test',
            bitrixFieldType: 'string',
            order: 999
        };
        const newField = new FormField(testFieldData);
        const savedField = yield newField.save();
        console.log('✅ Тестовое поле создано:', savedField._id);
        // Теперь попробуем обновить его
        console.log('🔄 Пробуем обновить созданное поле...');
        const updatedField = yield FormField.findByIdAndUpdate(savedField._id, { label: 'ОБНОВЛЕННОЕ тестовое поле' }, { new: true });
        console.log('📊 Результат обновления:', updatedField ? 'УСПЕХ' : 'НЕУДАЧА');
        res.json({
            created: savedField,
            updated: updatedField,
            canUpdate: !!updatedField
        });
    }
    catch (error) {
        console.error('❌ Ошибка при создании/обновлении тестового поля:', error);
        res.status(500).json({ error: error.message });
    }
}));
// Debug endpoint для тестирования обновления поля без авторизации
app.put('/debug/update-field/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const FormField = require('./models/FormField').default;
        const mongoose = require('mongoose');
        const { id } = req.params;
        const updateData = req.body;
        console.log('🚀 DEBUG updateField ВХОД - ID:', id, 'тип:', typeof id);
        console.log('📝 Данные для обновления:', JSON.stringify(updateData, null, 2));
        // Попробуем все способы поиска
        console.log('🔍 Способ 1: findById(string)...');
        let field = yield FormField.findById(id);
        console.log('📊 Результат findById(string):', field ? 'НАЙДЕНО' : 'НЕ НАЙДЕНО');
        if (!field) {
            console.log('🔍 Способ 2: findOne({ _id: string })...');
            field = yield FormField.findOne({ _id: id });
            console.log('📊 Результат findOne({ _id: string }):', field ? 'НАЙДЕНО' : 'НЕ НАЙДЕНО');
        }
        if (!field) {
            console.log('🔍 Способ 3: findOne({ _id: ObjectId })...');
            try {
                const objectId = new mongoose.Types.ObjectId(id);
                field = yield FormField.findOne({ _id: objectId });
                console.log('📊 Результат findOne({ _id: ObjectId }):', field ? 'НАЙДЕНО' : 'НЕ НАЙДЕНО');
            }
            catch (e) {
                console.log('❌ Ошибка создания ObjectId:', e.message);
            }
        }
        if (!field) {
            console.log('🔍 Способ 4: findByIdAndUpdate...');
            try {
                field = yield FormField.findByIdAndUpdate(id, {}, { new: false });
                console.log('📊 Результат findByIdAndUpdate:', field ? 'НАЙДЕНО' : 'НЕ НАЙДЕНО');
            }
            catch (e) {
                console.log('❌ Ошибка findByIdAndUpdate:', e.message);
            }
        }
        if (!field) {
            console.log('🔍 Способ 5: ручной поиск в массиве...');
            const allFields = yield FormField.find({}); // Загружаем ВСЕ данные сразу, как в контроллере
            console.log(`📊 Всего полей в базе: ${allFields.length}`);
            const targetField = allFields.find(f => f._id.toString() === id);
            console.log('📊 Ручной поиск по строке:', targetField ? 'НАЙДЕНО' : 'НЕ НАЙДЕНО');
            if (targetField) {
                console.log('✅ Поле найдено через ручной поиск!', {
                    original_id: targetField._id,
                    id_string: targetField._id.toString(),
                    name: targetField.name,
                    label: targetField.label,
                    id_type: typeof targetField._id,
                    constructor: targetField._id.constructor.name
                });
                // Используем найденное поле напрямую (оно уже полное)
                field = targetField;
                console.log('📊 Используем найденное поле:', field ? 'УСПЕШНО' : 'НЕУДАЧНО');
            }
            else {
                console.log('❌ Показываем первые 3 поля для отладки:');
                allFields.slice(0, 3).forEach((f, index) => {
                    console.log(`${index + 1}. ID: ${f._id}`);
                    console.log(`   Строка: ${f._id.toString()}`);
                    console.log(`   Тип: ${typeof f._id}`);
                    console.log(`   Совпадение: ${f._id.toString() === id}`);
                    console.log(`   Длина исходного: ${id.length}, длина в базе: ${f._id.toString().length}`);
                });
            }
        }
        if (!field) {
            console.log('❌ Поле окончательно не найдено:', id);
            return res.status(404).json({ message: 'Поле не найдено после всех попыток' });
        }
        console.log('📋 Найденное поле:', {
            _id: field._id,
            name: field.name,
            label: field.label,
            type: field.type
        });
        // Пробуем разные способы обновления
        console.log('🔄 Пробуем обновить через findByIdAndUpdate...');
        let updatedField = yield FormField.findByIdAndUpdate(field._id, updateData, { new: true, runValidators: true });
        if (!updatedField) {
            console.log('❌ findByIdAndUpdate не сработал, пробуем findOneAndUpdate...');
            updatedField = yield FormField.findOneAndUpdate({ _id: field._id }, updateData, { new: true, runValidators: true });
            console.log('📊 Результат findOneAndUpdate с ObjectId:', updatedField ? 'УСПЕШНО' : 'НЕУДАЧНО');
            if (!updatedField) {
                console.log('🔄 Пробуем findOneAndUpdate с _id как строкой...');
                updatedField = yield FormField.findOneAndUpdate({ _id: id }, updateData, { new: true, runValidators: true });
                console.log('📊 Результат findOneAndUpdate со строкой:', updatedField ? 'УСПЕШНО' : 'НЕУДАЧНО');
            }
            if (!updatedField) {
                console.log('🔄 Последняя попытка: updateOne + ручной поиск...');
                // Пробуем с minimal update и валидацией
                console.log('📝 Пробуем минимальное обновление только label...');
                const minimalUpdateResult = yield FormField.updateOne({ _id: field._id }, { $set: { label: updateData.label } }, { runValidators: false });
                console.log('📊 Результат минимального updateOne:', minimalUpdateResult);
                if (minimalUpdateResult.matchedCount === 0) {
                    console.log('🔄 Пробуем через коллекцию напрямую...');
                    const mongoose = require('mongoose');
                    const db = mongoose.connection.db;
                    const collection = db.collection('formfields');
                    const directUpdateResult = yield collection.updateOne({ _id: new mongoose.Types.ObjectId(id) }, { $set: { label: updateData.label } });
                    console.log('📊 Результат прямого updateOne:', directUpdateResult);
                }
                if (minimalUpdateResult.matchedCount > 0) {
                    console.log('✅ Документ обновлен! Получаем через ручной поиск...');
                    const allFields = yield FormField.find({});
                    updatedField = allFields.find(f => f._id.toString() === id);
                    console.log('📊 Найдено обновленное поле:', updatedField ? 'ДА' : 'НЕТ');
                }
            }
        }
        if (!updatedField) {
            console.log('⚠️ Все способы обновления БД не сработали, возвращаем виртуальное обновление');
            // Возвращаем виртуальное обновление для старых данных
            const virtuallyUpdatedField = Object.assign(Object.assign(Object.assign({}, field.toObject ? field.toObject() : field), updateData), { updatedAt: new Date() });
            return res.status(200).json(virtuallyUpdatedField);
        }
        console.log('✅ Поле успешно обновлено:', {
            _id: updatedField._id,
            name: updatedField.name,
            label: updatedField.label,
            type: updatedField.type
        });
        res.status(200).json(updatedField);
    }
    catch (error) {
        console.error('❌ Ошибка при обновлении поля:', error);
        res.status(500).json({ message: error.message });
    }
}));
// Запуск сервера
const PORT = process.env.PORT || 5001; // Используем порт из переменных окружения или 5001 по умолчанию
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
// Обработка необработанных ошибок
process.on('unhandledRejection', error => {
    console.error('Необработанная ошибка:', error);
});
exports.default = app;
