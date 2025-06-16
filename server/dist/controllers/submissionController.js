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
exports.getBitrixStages = exports.deleteSubmission = exports.updateSubmission = exports.getSubmissionWithBitrixData = exports.updateSubmissionStatus = exports.getSubmissionById = exports.getMySubmissions = exports.getAllSubmissions = exports.submitForm = void 0;
const Form_1 = __importDefault(require("../models/Form"));
const Submission_1 = __importDefault(require("../models/Submission"));
const SubmissionHistory_1 = __importDefault(require("../models/SubmissionHistory"));
const User_1 = __importDefault(require("../models/User"));
const bitrix24Service_1 = __importDefault(require("../services/bitrix24Service"));
// Обработка отправки формы заявки - НОВАЯ ЛОГИКА
const submitForm = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { formId, formData } = req.body;
        if (!formId || !formData) {
            return res.status(400).json({
                message: 'Необходимо указать ID формы и данные формы',
            });
        }
        console.log('[SUBMIT NEW] Начало обработки заявки');
        console.log('[SUBMIT NEW] Form ID:', formId);
        console.log('[SUBMIT NEW] Form Data:', Object.keys(formData));
        // Получаем форму с полями для маппинга
        const form = yield Form_1.default.findById(formId).populate('fields');
        if (!form) {
            return res.status(404).json({ message: 'Форма не найдена' });
        }
        // Проверяем, активна ли форма
        if (!form.isActive) {
            return res.status(400).json({ message: 'Форма не активна' });
        }
        console.log('[SUBMIT NEW] Форма найдена:', form.name);
        console.log('[SUBMIT NEW] Полей в форме:', form.fields.length);
        // Подготавливаем данные для создания сделки в Битрикс24
        const dealData = {};
        // Динамически определяем TITLE из поля формы
        let dealTitle = `Заявка ${Date.now()}`; // fallback
        // Проходим по всем полям формы и заполняем данные для сделки
        for (const field of form.fields) {
            // Проверяем, есть ли значение для этого поля
            if (formData[field.name] !== undefined && field.bitrixFieldId) {
                const value = formData[field.name];
                dealData[field.bitrixFieldId] = value;
                // Если это поле маппится на TITLE, используем его как название
                if (field.bitrixFieldId === 'TITLE' && value) {
                    dealTitle = value;
                }
                console.log(`[SUBMIT NEW] Поле ${field.name} -> ${field.bitrixFieldId}: "${value}"`);
            }
            else if (field.required) {
                // Если поле обязательное, но значение не предоставлено
                return res.status(400).json({
                    message: `Поле "${field.label}" обязательно для заполнения`,
                });
            }
        }
        // Устанавливаем название сделки
        dealData['TITLE'] = dealTitle;
        // Устанавливаем начальный статус
        dealData['STAGE_ID'] = 'C1:NEW';
        // Если пользователь авторизован, добавляем информацию о нем
        if ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) {
            const user = yield User_1.default.findById(req.user.id);
            if (user && user.bitrix_id) {
                dealData['ASSIGNED_BY_ID'] = user.bitrix_id;
                console.log(`[SUBMIT NEW] Ответственный: ${user.bitrix_id}`);
            }
        }
        // Устанавливаем категорию сделки (по умолчанию 1, если не указана)
        const categoryId = form.bitrixDealCategory || '1';
        dealData['CATEGORY_ID'] = categoryId;
        console.log(`[SUBMIT NEW] Категория: ${categoryId}`);
        console.log('[SUBMIT NEW] Данные для Битрикс24:', dealData);
        try {
            // ОСНОВНОЕ: создаем сделку в Битрикс24 СРАЗУ
            console.log('[SUBMIT NEW] Создание сделки в Битрикс24...');
            const dealResponse = yield bitrix24Service_1.default.createDeal(dealData);
            console.log('[SUBMIT NEW] Сделка создана в Битрикс24:', dealResponse.result);
            // Только ПОСЛЕ успешного создания в Битрикс24 сохраняем в БД
            const submission = new Submission_1.default({
                formId: formId,
                userId: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.id) || null,
                title: dealTitle,
                status: 'C1:NEW',
                priority: 'medium',
                bitrixDealId: dealResponse.result.toString(),
                bitrixCategoryId: categoryId,
                bitrixSyncStatus: 'synced',
            });
            yield submission.save();
            console.log(`[SUBMIT NEW] Заявка сохранена в БД: ${submission.submissionNumber}`);
            // Добавляем запись в историю
            yield new SubmissionHistory_1.default({
                submissionId: submission._id,
                action: 'created',
                changeType: 'data_update',
                description: 'Заявка создана в Битрикс24',
                newValue: { bitrixDealId: dealResponse.result, title: dealTitle },
                changedBy: ((_c = req.user) === null || _c === void 0 ? void 0 : _c.id) || null,
            }).save();
            // Возвращаем успешный ответ
            res.status(200).json({
                success: true,
                message: form.successMessage || 'Спасибо! Ваша заявка успешно отправлена.',
                submissionId: submission._id,
                submissionNumber: submission.submissionNumber,
                dealId: submission.bitrixDealId,
            });
        }
        catch (bitrixError) {
            console.error('[SUBMIT NEW] КРИТИЧЕСКАЯ ОШИБКА - не удалось создать сделку в Битрикс24:', bitrixError);
            // Если не удалось создать в Битрикс24 - НЕ создаем заявку в БД
            return res.status(500).json({
                message: 'Ошибка создания заявки в системе',
                error: bitrixError.message,
            });
        }
    }
    catch (error) {
        console.error('[SUBMIT NEW] Общая ошибка при отправке формы:', error);
        res.status(500).json({
            message: 'Произошла ошибка при обработке заявки',
            error: error.message,
        });
    }
});
exports.submitForm = submitForm;
// Получение всех заявок (для админов)
const getAllSubmissions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 20, status, priority, assignedTo, userId, dateFrom, dateTo, search, tags, } = req.query;
        // Строим фильтр
        const filter = {};
        if (status)
            filter.status = status;
        if (priority)
            filter.priority = priority;
        if (assignedTo)
            filter.assignedTo = assignedTo;
        if (userId)
            filter.userId = userId;
        if (tags && Array.isArray(tags))
            filter.tags = { $in: tags };
        // Фильтр по дате
        if (dateFrom || dateTo) {
            filter.createdAt = {};
            if (dateFrom)
                filter.createdAt.$gte = new Date(dateFrom);
            if (dateTo)
                filter.createdAt.$lte = new Date(dateTo);
        }
        // Поиск по номеру заявки или названию
        if (search) {
            filter.$or = [
                { submissionNumber: { $regex: search, $options: 'i' } },
                { title: { $regex: search, $options: 'i' } },
            ];
        }
        const skip = (Number(page) - 1) * Number(limit);
        const submissions = yield Submission_1.default.find(filter)
            .populate('formId', 'name title')
            .populate('userId', 'firstName lastName email')
            .populate('assignedTo', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));
        const total = yield Submission_1.default.countDocuments(filter);
        res.json({
            success: true,
            data: submissions,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error('Ошибка получения заявок:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения заявок',
        });
    }
});
exports.getAllSubmissions = getAllSubmissions;
// Получение заявок текущего пользователя
const getMySubmissions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { page = 1, limit = 20 } = req.query;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Пользователь не авторизован',
            });
        }
        const skip = (Number(page) - 1) * Number(limit);
        const submissions = yield Submission_1.default.find({ userId })
            .populate('formId', 'name title')
            .populate('assignedTo', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));
        const total = yield Submission_1.default.countDocuments({ userId });
        res.json({
            success: true,
            data: submissions,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error('Ошибка получения заявок пользователя:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения заявок',
        });
    }
});
exports.getMySubmissions = getMySubmissions;
// Получение заявки по ID
const getSubmissionById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const isAdmin = req.isAdmin;
        const submission = yield Submission_1.default.findById(id)
            .populate('formId', 'name title')
            .populate('userId', 'firstName lastName email')
            .populate('assignedTo', 'firstName lastName email');
        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Заявка не найдена',
            });
        }
        // Проверяем права доступа
        if (!isAdmin && ((_b = submission.userId) === null || _b === void 0 ? void 0 : _b.toString()) !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Нет прав для просмотра этой заявки',
            });
        }
        // Получаем историю изменений
        const history = yield SubmissionHistory_1.default.find({ submissionId: id })
            .populate('changedBy', 'firstName lastName email')
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            data: {
                submission,
                history,
            },
        });
    }
    catch (error) {
        console.error('Ошибка получения заявки:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения заявки',
        });
    }
});
exports.getSubmissionById = getSubmissionById;
// Обновление статуса заявки
const updateSubmissionStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const { status, comment } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const submission = yield Submission_1.default.findById(id);
        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Заявка не найдена',
            });
        }
        const oldStatus = submission.status;
        submission.status = status;
        yield submission.save();
        // Добавляем запись в историю
        yield new SubmissionHistory_1.default({
            submissionId: id,
            action: 'status_changed',
            changeType: 'status_change',
            description: `Статус изменен с "${oldStatus}" на "${status}"`,
            oldValue: oldStatus,
            newValue: status,
            comment,
            changedBy: userId,
        }).save();
        // Синхронизируем с Битрикс24 если есть dealId
        if (submission.bitrixDealId) {
            try {
                yield bitrix24Service_1.default.updateDealStatus(submission.bitrixDealId, status, submission.bitrixCategoryId);
                submission.bitrixSyncStatus = 'synced';
                yield submission.save();
            }
            catch (bitrixError) {
                console.error('Ошибка синхронизации статуса с Битрикс24:', bitrixError);
                submission.bitrixSyncStatus = 'failed';
                submission.bitrixSyncError = bitrixError.message;
                yield submission.save();
            }
        }
        res.json({
            success: true,
            message: 'Статус заявки обновлен',
        });
    }
    catch (error) {
        console.error('Ошибка обновления статуса:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка обновления статуса',
        });
    }
});
exports.updateSubmissionStatus = updateSubmissionStatus;
// Получение заявки с актуальными данными из Битрикс24 для редактирования - НОВАЯ ЛОГИКА
const getSubmissionWithBitrixData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        console.log(`[EDIT NEW] Получение заявки ${id} для редактирования`);
        console.log(`[EDIT NEW] Пользователь: ${userId}, админ: ${req.isAdmin}`);
        const submission = yield Submission_1.default.findById(id)
            .populate('userId', 'name firstName lastName email bitrixId')
            .populate('formId');
        if (!submission) {
            console.log(`[EDIT NEW] Заявка ${id} не найдена`);
            return res.status(404).json({
                success: false,
                message: 'Заявка не найдена',
            });
        }
        console.log(`[EDIT NEW] Заявка найдена:`);
        console.log(`[EDIT NEW] - Номер: ${submission.submissionNumber}`);
        console.log(`[EDIT NEW] - Название: ${submission.title}`);
        console.log(`[EDIT NEW] - Битрикс Deal ID: ${submission.bitrixDealId}`);
        console.log(`[EDIT NEW] - Статус синхронизации: ${submission.bitrixSyncStatus}`);
        // Проверяем права доступа
        const isAdmin = req.isAdmin;
        console.log(`[EDIT NEW] Проверка прав доступа:`);
        console.log(`[EDIT NEW] - isAdmin: ${isAdmin}`);
        console.log(`[EDIT NEW] - userId из токена: ${userId}`);
        console.log(`[EDIT NEW] - submission.userId: ${submission.userId}`);
        console.log(`[EDIT NEW] - submission.userId._id: ${(_b = submission.userId) === null || _b === void 0 ? void 0 : _b._id}`);
        console.log(`[EDIT NEW] - submission.userId._id.toString(): ${(_d = (_c = submission.userId) === null || _c === void 0 ? void 0 : _c._id) === null || _d === void 0 ? void 0 : _d.toString()}`);
        // Исправляем проверку: сравниваем _id из populate объекта
        const submissionUserId = ((_f = (_e = submission.userId) === null || _e === void 0 ? void 0 : _e._id) === null || _f === void 0 ? void 0 : _f.toString()) || ((_g = submission.userId) === null || _g === void 0 ? void 0 : _g.toString());
        console.log(`[EDIT NEW] - Сравнение: ${submissionUserId} === ${userId} -> ${submissionUserId === userId}`);
        if (!isAdmin && submissionUserId !== userId) {
            console.log(`[EDIT NEW] ❌ ДОСТУП ЗАПРЕЩЕН: Пользователь ${userId} пытается получить заявку пользователя ${submissionUserId}`);
            return res.status(403).json({
                success: false,
                message: 'Нет прав для просмотра этой заявки',
            });
        }
        console.log(`[EDIT NEW] ✅ ДОСТУП РАЗРЕШЕН: Пользователь имеет права для просмотра заявки`);
        // Получаем актуальные данные из Битрикс24
        let formDataFromBitrix = {};
        let preloadedOptions = {};
        try {
            console.log(`[EDIT NEW] Получение актуальных данных сделки ${submission.bitrixDealId}`);
            // Получаем данные сделки из Битрикс24
            const dealResponse = yield bitrix24Service_1.default.getDeal(submission.bitrixDealId);
            console.log(`[EDIT NEW] Ответ от Битрикс24:`, dealResponse);
            if (dealResponse === null || dealResponse === void 0 ? void 0 : dealResponse.result) {
                const dealData = dealResponse.result;
                console.log(`[EDIT NEW] Данные сделки из Битрикс24:`, Object.keys(dealData));
                // Получаем форму для правильного маппинга полей
                const form = yield Form_1.default.findById(submission.formId).populate('fields');
                if (form) {
                    console.log(`[EDIT NEW] Форма найдена, полей: ${form.fields.length}`);
                    // Отладка полей формы
                    console.log('[EDIT NEW] Поля формы с bitrixFieldId:');
                    console.log('[EDIT NEW] RAW form.fields:', JSON.stringify(form.fields, null, 2));
                    form.fields.forEach((field, index) => {
                        console.log(`[EDIT NEW] Поле ${index}:`, field);
                        console.log(`[EDIT NEW] Поле ${index}: name="${field.name}", bitrixFieldId="${field.bitrixFieldId}"`);
                    });
                    // Собираем предзагруженные опции для автокомплита
                    // Конвертируем данные из Битрикс24 обратно в формат формы
                    for (const field of form.fields) {
                        console.log(`[EDIT NEW] Проверяем поле: ${field.name}, bitrixFieldId: ${field.bitrixFieldId}`);
                        if (field.bitrixFieldId &&
                            dealData[field.bitrixFieldId] !== undefined) {
                            let bitrixValue = dealData[field.bitrixFieldId];
                            // Для полей автокомплита с товарами - загружаем название товара
                            if (field.type === 'autocomplete' &&
                                ((_h = field.dynamicSource) === null || _h === void 0 ? void 0 : _h.enabled) &&
                                field.dynamicSource.source === 'catalog' &&
                                bitrixValue) {
                                try {
                                    console.log(`[EDIT NEW] 🔍 Загрузка названия товара для ID: ${bitrixValue}`);
                                    const productResponse = yield bitrix24Service_1.default.getProduct(bitrixValue);
                                    if (productResponse === null || productResponse === void 0 ? void 0 : productResponse.result) {
                                        const productName = productResponse.result.NAME;
                                        console.log(`[EDIT NEW] 📦 Товар ${bitrixValue}: "${productName}"`);
                                        // Добавляем в предзагруженные опции
                                        preloadedOptions[field.name] = [
                                            {
                                                value: bitrixValue,
                                                label: productName,
                                            },
                                        ];
                                    }
                                }
                                catch (productError) {
                                    console.error(`[EDIT NEW] ❌ Ошибка загрузки товара ${bitrixValue}:`, productError);
                                    // Оставляем ID если не удалось загрузить название
                                }
                            }
                            // Для полей автокомплита с компаниями - загружаем название компании
                            if (field.type === 'autocomplete' &&
                                ((_j = field.dynamicSource) === null || _j === void 0 ? void 0 : _j.enabled) &&
                                field.dynamicSource.source === 'companies' &&
                                bitrixValue &&
                                bitrixValue !== '0' // Пропускаем пустые компании
                            ) {
                                try {
                                    console.log(`[EDIT NEW] 🔍 Загрузка названия компании для ID: ${bitrixValue}`);
                                    const companyResponse = yield bitrix24Service_1.default.getCompany(bitrixValue);
                                    if (companyResponse === null || companyResponse === void 0 ? void 0 : companyResponse.result) {
                                        const companyName = companyResponse.result.TITLE;
                                        console.log(`[EDIT NEW] 🏢 Компания ${bitrixValue}: "${companyName}"`);
                                        // Добавляем в предзагруженные опции
                                        preloadedOptions[field.name] = [
                                            {
                                                value: bitrixValue,
                                                label: companyName,
                                            },
                                        ];
                                    }
                                }
                                catch (companyError) {
                                    console.error(`[EDIT NEW] ❌ Ошибка загрузки компании ${bitrixValue}:`, companyError);
                                    // Оставляем ID если не удалось загрузить название
                                }
                            }
                            formDataFromBitrix[field.name] = bitrixValue;
                            console.log(`[EDIT NEW] ✅ Маппинг ${field.bitrixFieldId} -> ${field.name}:`, bitrixValue);
                        }
                        else {
                            console.log(`[EDIT NEW] ❌ Пропуск поля ${field.name}: bitrixFieldId=${field.bitrixFieldId}, значение в Bitrix=${dealData[field.bitrixFieldId]}`);
                        }
                    }
                    console.log('[EDIT NEW] FormData восстановлен из Битрикс24:', Object.keys(formDataFromBitrix));
                    console.log('[EDIT NEW] Предзагруженные опции:', JSON.stringify(preloadedOptions, null, 2));
                }
                else {
                    console.log('[EDIT NEW] Форма не найдена');
                }
            }
            else {
                console.log('[EDIT NEW] Пустой ответ от Битрикс24');
            }
            // Обновляем статус синхронизации
            submission.bitrixSyncStatus = 'synced';
            yield submission.save();
        }
        catch (bitrixError) {
            console.error('[EDIT NEW] Ошибка получения данных из Битрикс24:', bitrixError);
            // Не блокируем выдачу заявки, если есть ошибки с Битрикс24
            submission.bitrixSyncStatus = 'failed';
            submission.bitrixSyncError = bitrixError.message;
            yield submission.save();
            // В случае ошибки возвращаем пустую форму
            formDataFromBitrix = {};
        }
        // Возвращаем заявку с данными из Битрикс24
        const responseData = {
            _id: submission._id,
            submissionNumber: submission.submissionNumber,
            title: submission.title,
            status: submission.status,
            priority: submission.priority,
            bitrixDealId: submission.bitrixDealId,
            bitrixCategoryId: submission.bitrixCategoryId,
            bitrixSyncStatus: submission.bitrixSyncStatus,
            bitrixSyncError: submission.bitrixSyncError,
            formId: submission.formId,
            userId: submission.userId,
            createdAt: submission.createdAt,
            updatedAt: submission.updatedAt,
            formData: formDataFromBitrix, // Данные ВСЕГДА из Битрикс24
            preloadedOptions: preloadedOptions, // Предзагруженные опции для автокомплита
        };
        console.log(`[EDIT NEW] Возвращаем данные заявки`);
        res.json({
            success: true,
            data: responseData,
        });
    }
    catch (error) {
        console.error('[EDIT NEW] Ошибка получения заявки:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения заявки',
        });
    }
});
exports.getSubmissionWithBitrixData = getSubmissionWithBitrixData;
// Обновление заявки - НОВАЯ ЛОГИКА: сразу в Битрикс24
const updateSubmission = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const { id } = req.params;
        const updateData = req.body; // Это formData из клиента
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        console.log(`[UPDATE NEW] Обновление заявки ${id}`);
        console.log(`[UPDATE NEW] Данные для обновления:`, Object.keys(updateData));
        const submission = yield Submission_1.default.findById(id).populate('userId');
        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Заявка не найдена',
            });
        }
        // Проверяем права доступа
        const isAdmin = req.isAdmin;
        console.log(`[UPDATE NEW] Проверка прав доступа:`);
        console.log(`[UPDATE NEW] - isAdmin: ${isAdmin}`);
        console.log(`[UPDATE NEW] - userId из токена: ${userId}`);
        console.log(`[UPDATE NEW] - submission.userId._id: ${(_b = submission.userId) === null || _b === void 0 ? void 0 : _b._id}`);
        // Исправляем проверку: сравниваем _id из populate объекта
        const submissionUserId = ((_d = (_c = submission.userId) === null || _c === void 0 ? void 0 : _c._id) === null || _d === void 0 ? void 0 : _d.toString()) || ((_e = submission.userId) === null || _e === void 0 ? void 0 : _e.toString());
        console.log(`[UPDATE NEW] - Сравнение: ${submissionUserId} === ${userId} -> ${submissionUserId === userId}`);
        if (!isAdmin && submissionUserId !== userId) {
            console.log(`[UPDATE NEW] ❌ ДОСТУП ЗАПРЕЩЕН: Пользователь ${userId} пытается обновить заявку пользователя ${submissionUserId}`);
            return res.status(403).json({
                success: false,
                message: 'Нет прав для редактирования этой заявки',
            });
        }
        console.log(`[UPDATE NEW] ✅ ДОСТУП РАЗРЕШЕН: Пользователь имеет права для обновления заявки`);
        console.log(`[UPDATE NEW] Заявка найдена: ${submission.submissionNumber}`);
        console.log(`[UPDATE NEW] Битрикс Deal ID: ${submission.bitrixDealId}`);
        try {
            console.log(`[UPDATE NEW] Обновление сделки ${submission.bitrixDealId} в Битрикс24`);
            // Получаем форму для правильного маппинга полей
            const form = yield Form_1.default.findById(submission.formId).populate('fields');
            if (!form) {
                throw new Error('Форма не найдена');
            }
            console.log(`[UPDATE NEW] Форма найдена, полей: ${form.fields.length}`);
            // Формируем данные для обновления сделки
            const dealData = {};
            let newTitle = submission.title; // fallback
            // Проходим по всем полям формы и маппим данные в поля Битрикс24
            for (const field of form.fields) {
                // Проверяем, есть ли значение для этого поля в updateData
                if (updateData[field.name] !== undefined && field.bitrixFieldId) {
                    const value = updateData[field.name];
                    dealData[field.bitrixFieldId] = value;
                    // Если это поле маппится на TITLE, обновляем название
                    if (field.bitrixFieldId === 'TITLE' && value) {
                        newTitle = value;
                    }
                    console.log(`[UPDATE NEW] Поле ${field.name} -> ${field.bitrixFieldId}: "${value}"`);
                }
            }
            console.log('[UPDATE NEW] Данные для обновления в Битрикс24:', dealData);
            // Обновляем сделку в Битрикс24
            yield bitrix24Service_1.default.updateDeal(submission.bitrixDealId, dealData);
            // Обновляем только название в БД для быстрого доступа
            submission.title = newTitle;
            submission.bitrixSyncStatus = 'synced';
            submission.bitrixSyncError = undefined;
            yield submission.save();
            console.log(`[UPDATE NEW] Сделка ${submission.bitrixDealId} успешно обновлена`);
            // Добавляем запись в историю
            yield new SubmissionHistory_1.default({
                submissionId: id,
                action: 'updated',
                changeType: 'data_update',
                description: 'Заявка обновлена в Битрикс24',
                newValue: { title: newTitle, updatedFields: Object.keys(dealData) },
                changedBy: userId,
            }).save();
            res.json({
                success: true,
                data: {
                    _id: submission._id,
                    submissionNumber: submission.submissionNumber,
                    title: newTitle,
                    bitrixDealId: submission.bitrixDealId,
                    bitrixSyncStatus: 'synced',
                },
                message: 'Заявка успешно обновлена',
            });
        }
        catch (bitrixError) {
            console.error('[UPDATE NEW] Ошибка обновления сделки в Битрикс24:', bitrixError);
            submission.bitrixSyncStatus = 'failed';
            submission.bitrixSyncError = bitrixError.message;
            yield submission.save();
            res.status(500).json({
                success: false,
                message: 'Ошибка обновления заявки в Битрикс24',
                error: bitrixError.message,
            });
        }
    }
    catch (error) {
        console.error('[UPDATE NEW] Ошибка обновления заявки:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка обновления заявки',
        });
    }
});
exports.updateSubmission = updateSubmission;
// Удаление заявки
const deleteSubmission = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const submission = yield Submission_1.default.findById(id);
        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Заявка не найдена',
            });
        }
        yield Submission_1.default.findByIdAndDelete(id);
        yield SubmissionHistory_1.default.deleteMany({ submissionId: id });
        res.json({
            success: true,
            message: 'Заявка удалена',
        });
    }
    catch (error) {
        console.error('Ошибка удаления заявки:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка удаления заявки',
        });
    }
});
exports.deleteSubmission = deleteSubmission;
// Получение статусов из Битрикс24
const getBitrixStages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { categoryId } = req.params;
        // Возвращаем только нужные статусы
        const allowedStages = [
            {
                id: 'C1:NEW',
                name: 'Новая',
                sort: 10,
            },
            {
                id: 'C1:UC_GJLIZP',
                name: 'Отправлено',
                sort: 20,
            },
            {
                id: 'C1:WON',
                name: 'Отгружено',
                sort: 30,
            },
        ];
        res.json({
            success: true,
            data: allowedStages,
        });
    }
    catch (error) {
        console.error('Ошибка получения статусов:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения статусов',
        });
    }
});
exports.getBitrixStages = getBitrixStages;
