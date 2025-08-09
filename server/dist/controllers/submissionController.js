"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.copySubmission = exports.checkBitrixField = exports.updateStatusByBitrixId = exports.getBitrixStages = exports.deleteSubmission = exports.updateSubmission = exports.getSubmissionWithBitrixData = exports.updateSubmissionStatus = exports.getSubmissionById = exports.getMySubmissions = exports.getAllSubmissions = exports.submitForm = void 0;
const FormService_1 = require("../services/FormService");
const SubmissionService_1 = require("../services/SubmissionService");
const UserService_1 = require("../services/UserService");
const bitrix24Service_1 = __importDefault(require("../services/bitrix24Service"));
const Submission_entity_1 = require("../database/entities/Submission.entity");
const formService = (0, FormService_1.getFormService)();
const submissionService = (0, SubmissionService_1.getSubmissionService)();
const userService = (0, UserService_1.getUserService)();
// Обработка отправки формы заявки
const submitForm = async (req, res) => {
    try {
        const { formId, formData } = req.body;
        if (!formId || !formData) {
            return res.status(400).json({
                message: 'Необходимо указать ID формы и данные формы',
            });
        }
        console.log('[SUBMIT] Начало обработки заявки');
        console.log('[SUBMIT] Form ID:', formId);
        console.log('[SUBMIT] Form Data:', Object.keys(formData));
        // Получаем форму с полями для маппинга
        const form = await formService.findWithFields(formId);
        if (!form) {
            return res.status(404).json({ message: 'Форма не найдена' });
        }
        // Проверяем, активна ли форма
        if (!form.isActive) {
            return res.status(400).json({ message: 'Форма не активна' });
        }
        console.log('[SUBMIT] Форма найдена:', form.name);
        console.log('[SUBMIT] Полей в форме:', form.fields.length);
        // Валидация данных формы
        const validation = await formService.validateFormData(formId, formData);
        if (!validation.isValid) {
            return res.status(400).json({
                message: 'Ошибка валидации данных',
                errors: validation.errors
            });
        }
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
                console.log(`[SUBMIT] Поле ${field.name} -> ${field.bitrixFieldId}: "${value}"`);
            }
        }
        // Устанавливаем название сделки
        dealData['TITLE'] = dealTitle;
        // Устанавливаем начальный статус
        dealData['STAGE_ID'] = 'C1:NEW';
        // Если пользователь авторизован, добавляем информацию о нем
        if (req.user?.id) {
            const user = await userService.findById(req.user.id);
            if (user && user.bitrixUserId) {
                dealData['ASSIGNED_BY_ID'] = user.bitrixUserId;
                console.log(`[SUBMIT] Ответственный: ${user.bitrixUserId}`);
            }
        }
        // Устанавливаем категорию сделки (по умолчанию 1, если не указана)
        const categoryId = form.bitrixDealCategory || '1';
        dealData['CATEGORY_ID'] = categoryId;
        console.log(`[SUBMIT] Категория: ${categoryId}`);
        console.log('[SUBMIT] Данные для Битрикс24:', dealData);
        let submission = null;
        try {
            // СНАЧАЛА создаем заявку в БД для получения ID
            console.log('[SUBMIT] Создание заявки в БД...');
            submission = await submissionService.createSubmission({
                formId: formId,
                userId: req.user?.id,
                title: dealTitle,
                notes: 'Заявка создана через форму'
            });
            console.log(`[SUBMIT] Заявка сохранена в БД: ${submission.submissionNumber}, ID: ${submission.id}`);
            // Добавляем ID заявки в поле UF_CRM_1750107484181
            dealData['UF_CRM_1750107484181'] = submission.id;
            console.log(`[SUBMIT] ✅ Добавлен ID заявки в поле UF_CRM_1750107484181: ${submission.id}`);
            // ТЕПЕРЬ создаем сделку в Битрикс24 с ID заявки
            console.log('[SUBMIT] Создание сделки в Битрикс24...');
            const dealResponse = await bitrix24Service_1.default.createDeal(dealData);
            console.log('[SUBMIT] Сделка создана в Битрикс24:', dealResponse.result);
            // Обновляем заявку с полученным bitrixDealId
            await submissionService.updateSyncStatus(submission.id, Submission_entity_1.BitrixSyncStatus.SYNCED, dealResponse.result.toString());
            console.log(`[SUBMIT] Заявка обновлена с bitrixDealId: ${dealResponse.result}`);
            // Возвращаем успешный ответ
            res.status(200).json({
                success: true,
                message: form.successMessage || 'Спасибо! Ваша заявка успешно отправлена.',
                submissionId: submission.id,
                submissionNumber: submission.submissionNumber,
                dealId: dealResponse.result.toString(),
            });
        }
        catch (bitrixError) {
            console.error('[SUBMIT] КРИТИЧЕСКАЯ ОШИБКА - не удалось создать сделку в Битрикс24:', bitrixError);
            // Удаляем созданную заявку из БД, если не удалось создать сделку в Битрикс24
            if (submission && submission.id) {
                try {
                    await submissionService.delete(submission.id);
                    console.log(`[SUBMIT] Заявка ${submission.id} удалена из БД после ошибки Битрикс24`);
                }
                catch (deleteError) {
                    console.error(`[SUBMIT] Ошибка удаления заявки ${submission.id}:`, deleteError);
                }
            }
            return res.status(500).json({
                message: 'Ошибка создания заявки в системе',
                error: bitrixError.message,
            });
        }
    }
    catch (error) {
        console.error('[SUBMIT] Общая ошибка при отправке формы:', error);
        res.status(500).json({
            message: 'Произошла ошибка при обработке заявки',
            error: error.message,
        });
    }
};
exports.submitForm = submitForm;
// Получение всех заявок (для админов)
const getAllSubmissions = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, priority, assignedTo, userId, dateFrom, dateTo, search, tags, formId, bitrixSyncStatus, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        // Подготовка фильтров
        const filters = {
            status: status,
            priority: priority,
            assignedToId: assignedTo,
            userId: userId,
            dateFrom: dateFrom ? new Date(dateFrom) : undefined,
            dateTo: dateTo ? new Date(dateTo) : undefined,
            search: search,
            tags: Array.isArray(tags) ? tags : tags ? [tags] : undefined,
            formId: formId,
            bitrixSyncStatus: bitrixSyncStatus
        };
        // Подготовка пагинации
        const pagination = {
            page: Number(page),
            limit: Number(limit),
            sortBy: sortBy,
            sortOrder: sortOrder.toUpperCase()
        };
        console.log(`🔍 Запрос заявок: страница ${page}, лимит ${limit}`);
        // Используем сервис для получения заявок
        const result = await submissionService.searchSubmissions({
            ...filters,
            ...pagination
        });
        console.log(`✅ Получено ${result.data.length} заявок из ${result.total}`);
        res.status(200).json({
            success: true,
            ...result
        });
    }
    catch (error) {
        console.error('Ошибка при получении заявок:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении заявок',
            error: error.message,
        });
    }
};
exports.getAllSubmissions = getAllSubmissions;
// Получение заявок текущего пользователя
const getMySubmissions = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, priority, assignedTo, dateFrom, dateTo, search, tags, } = req.query;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Пользователь не авторизован',
            });
        }
        // Подготовка фильтров
        const filters = {
            userId,
            status: status,
            priority: priority,
            assignedToId: assignedTo,
            dateFrom: dateFrom ? new Date(dateFrom) : undefined,
            dateTo: dateTo ? new Date(dateTo) : undefined,
            search: search,
            tags: Array.isArray(tags) ? tags : tags ? [tags] : undefined,
        };
        // Подготовка пагинации
        const pagination = {
            page: Number(page),
            limit: Number(limit),
            sortBy: 'createdAt',
            sortOrder: 'desc'
        };
        const result = await submissionService.getUserSubmissions(userId, filters);
        res.json({
            success: true,
            ...result
        });
    }
    catch (error) {
        console.error('Ошибка получения заявок:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения заявок',
        });
    }
};
exports.getMySubmissions = getMySubmissions;
// Получение заявки по ID
const getSubmissionById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const isAdmin = req.isAdmin;
        const submission = await submissionService.findById(id);
        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Заявка не найдена',
            });
        }
        // Проверяем права доступа
        if (!isAdmin && submission.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Нет прав для просмотра этой заявки',
            });
        }
        // Получаем историю изменений
        const history = await submissionService.getSubmissionHistory(id);
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
};
exports.getSubmissionById = getSubmissionById;
// Обновление статуса заявки
const updateSubmissionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, comment } = req.body;
        const userId = req.user?.id;
        const submission = await submissionService.findById(id);
        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Заявка не найдена',
            });
        }
        // Обновляем статус
        await submissionService.updateStatus(id, status, userId);
        // Добавляем комментарий если есть
        if (comment) {
            await submissionService.addComment(id, comment, userId);
        }
        // Синхронизируем с Битрикс24 если есть dealId
        if (submission.bitrixDealId) {
            try {
                await bitrix24Service_1.default.updateDealStatus(submission.bitrixDealId, status, submission.bitrixCategoryId || '1');
                await submissionService.updateSyncStatus(id, Submission_entity_1.BitrixSyncStatus.SYNCED);
            }
            catch (bitrixError) {
                console.error('Ошибка синхронизации статуса с Битрикс24:', bitrixError);
                await submissionService.updateSyncStatus(id, Submission_entity_1.BitrixSyncStatus.FAILED, undefined, bitrixError.message);
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
};
exports.updateSubmissionStatus = updateSubmissionStatus;
// Получение заявки с актуальными данными из Битрикс24 для редактирования
const getSubmissionWithBitrixData = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        console.log(`[EDIT] Получение заявки ${id} для редактирования`);
        const submission = await submissionService.findById(id);
        if (!submission) {
            console.log(`[EDIT] Заявка ${id} не найдена`);
            return res.status(404).json({
                success: false,
                message: 'Заявка не найдена',
            });
        }
        // Проверяем права доступа
        const isAdmin = req.isAdmin;
        if (!isAdmin && submission.userId !== userId) {
            console.log(`[EDIT] ❌ ДОСТУП ЗАПРЕЩЕН: Пользователь ${userId} пытается получить заявку пользователя ${submission.userId}`);
            return res.status(403).json({
                success: false,
                message: 'Нет прав для просмотра этой заявки',
            });
        }
        // Получаем актуальные данные из Битрикс24
        let formDataFromBitrix = {};
        let preloadedOptions = {};
        try {
            console.log(`[EDIT] Получение актуальных данных сделки ${submission.bitrixDealId}`);
            // Получаем данные сделки из Битрикс24
            const dealResponse = await bitrix24Service_1.default.getDeal(submission.bitrixDealId);
            console.log(`[EDIT] Ответ от Битрикс24:`, dealResponse);
            if (dealResponse?.result) {
                const dealData = dealResponse.result;
                console.log(`[EDIT] Данные сделки из Битрикс24:`, Object.keys(dealData));
                // Получаем форму для правильного маппинга полей
                const form = await formService.findWithFields(submission.formId);
                if (form) {
                    console.log(`[EDIT] Форма найдена, полей: ${form.fields.length}`);
                    // Конвертируем данные из Битрикс24 обратно в формат формы
                    for (const field of form.fields) {
                        console.log(`[EDIT] Проверяем поле: ${field.name}, bitrixFieldId: ${field.bitrixFieldId}`);
                        if (field.bitrixFieldId &&
                            dealData[field.bitrixFieldId] !== undefined) {
                            let bitrixValue = dealData[field.bitrixFieldId];
                            // Для полей автокомплита - загружаем названия
                            if (field.type === 'autocomplete' &&
                                field.dynamicSource?.enabled &&
                                bitrixValue) {
                                try {
                                    // Загрузка названий в зависимости от источника
                                    if (field.dynamicSource.source === 'catalog') {
                                        console.log(`[EDIT] 🔍 Загрузка названия товара для ID: ${bitrixValue}`);
                                        const productResponse = await bitrix24Service_1.default.getProduct(bitrixValue);
                                        if (productResponse?.result) {
                                            const productName = productResponse.result.NAME;
                                            console.log(`[EDIT] 📦 Товар ${bitrixValue}: "${productName}"`);
                                            // Добавляем в предзагруженные опции
                                            preloadedOptions[field.name] = [
                                                {
                                                    value: bitrixValue,
                                                    label: productName,
                                                },
                                            ];
                                        }
                                    }
                                    else if (field.dynamicSource.source === 'companies') {
                                        console.log(`[EDIT] 🔍 Загрузка названия компании для ID: ${bitrixValue}`);
                                        const companyResponse = await bitrix24Service_1.default.getCompany(bitrixValue);
                                        if (companyResponse?.result) {
                                            const companyName = companyResponse.result.TITLE;
                                            console.log(`[EDIT] 🏢 Компания ${bitrixValue}: "${companyName}"`);
                                            // Добавляем в предзагруженные опции
                                            preloadedOptions[field.name] = [
                                                {
                                                    value: bitrixValue,
                                                    label: companyName,
                                                },
                                            ];
                                        }
                                    }
                                }
                                catch (entityError) {
                                    console.error(`[EDIT] ❌ Ошибка загрузки ${field.dynamicSource.source} ${bitrixValue}:`, entityError);
                                }
                            }
                            formDataFromBitrix[field.name] = bitrixValue;
                            console.log(`[EDIT] ✅ Маппинг ${field.bitrixFieldId} -> ${field.name}:`, bitrixValue);
                        }
                    }
                    console.log('[EDIT] FormData восстановлен из Битрикс24:', Object.keys(formDataFromBitrix));
                    console.log('[EDIT] Предзагруженные опции:', JSON.stringify(preloadedOptions, null, 2));
                }
                else {
                    console.log('[EDIT] Форма не найдена');
                }
            }
            else {
                console.log('[EDIT] Пустой ответ от Битрикс24');
            }
            // Обновляем статус синхронизации
            await submissionService.updateSyncStatus(submission.id, Submission_entity_1.BitrixSyncStatus.SYNCED);
        }
        catch (bitrixError) {
            console.error('[EDIT] Ошибка получения данных из Битрикс24:', bitrixError);
            // Не блокируем выдачу заявки, если есть ошибки с Битрикс24
            await submissionService.updateSyncStatus(submission.id, Submission_entity_1.BitrixSyncStatus.FAILED, undefined, bitrixError.message);
            // В случае ошибки возвращаем пустую форму
            formDataFromBitrix = {};
        }
        // Возвращаем заявку с данными из Битрикс24
        const responseData = {
            ...submission,
            formData: formDataFromBitrix, // Данные ВСЕГДА из Битрикс24
            preloadedOptions: preloadedOptions, // Предзагруженные опции для автокомплита
        };
        console.log(`[EDIT] Возвращаем данные заявки`);
        res.json({
            success: true,
            data: responseData,
        });
    }
    catch (error) {
        console.error('[EDIT] Ошибка получения заявки:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения заявки',
        });
    }
};
exports.getSubmissionWithBitrixData = getSubmissionWithBitrixData;
// Обновление заявки - сразу в Битрикс24
const updateSubmission = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body; // Это formData из клиента
        const userId = req.user?.id;
        console.log(`[UPDATE] Обновление заявки ${id}`);
        console.log(`[UPDATE] Данные для обновления:`, Object.keys(updateData));
        const submission = await submissionService.findById(id);
        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Заявка не найдена',
            });
        }
        // Проверяем права доступа
        const isAdmin = req.isAdmin;
        if (!isAdmin && submission.userId !== userId) {
            console.log(`[UPDATE] ❌ ДОСТУП ЗАПРЕЩЕН: Пользователь ${userId} пытается обновить заявку пользователя ${submission.userId}`);
            return res.status(403).json({
                success: false,
                message: 'Нет прав для редактирования этой заявки',
            });
        }
        console.log(`[UPDATE] Заявка найдена: ${submission.submissionNumber}`);
        console.log(`[UPDATE] Битрикс Deal ID: ${submission.bitrixDealId}`);
        try {
            console.log(`[UPDATE] Обновление сделки ${submission.bitrixDealId} в Битрикс24`);
            // Получаем форму для правильного маппинга полей
            const form = await formService.findWithFields(submission.formId);
            if (!form) {
                throw new Error('Форма не найдена');
            }
            console.log(`[UPDATE] Форма найдена, полей: ${form.fields.length}`);
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
                    console.log(`[UPDATE] Поле ${field.name} -> ${field.bitrixFieldId}: "${value}"`);
                }
            }
            console.log('[UPDATE] Данные для обновления в Битрикс24:', dealData);
            // Обновляем сделку в Битрикс24
            await bitrix24Service_1.default.updateDeal(submission.bitrixDealId, dealData);
            // Обновляем заявку в БД
            await submissionService.updateSubmission(id, { title: newTitle }, userId);
            // Обновляем статус синхронизации
            await submissionService.updateSyncStatus(id, Submission_entity_1.BitrixSyncStatus.SYNCED);
            console.log(`[UPDATE] Сделка ${submission.bitrixDealId} успешно обновлена`);
            res.json({
                success: true,
                data: {
                    id: submission.id,
                    submissionNumber: submission.submissionNumber,
                    title: newTitle,
                    bitrixDealId: submission.bitrixDealId,
                    bitrixSyncStatus: Submission_entity_1.BitrixSyncStatus.SYNCED,
                },
                message: 'Заявка успешно обновлена',
            });
        }
        catch (bitrixError) {
            console.error('[UPDATE] Ошибка обновления сделки в Битрикс24:', bitrixError);
            await submissionService.updateSyncStatus(id, Submission_entity_1.BitrixSyncStatus.FAILED, undefined, bitrixError.message);
            res.status(500).json({
                success: false,
                message: 'Ошибка обновления заявки в Битрикс24',
                error: bitrixError.message,
            });
        }
    }
    catch (error) {
        console.error('[UPDATE] Ошибка обновления заявки:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка обновления заявки',
        });
    }
};
exports.updateSubmission = updateSubmission;
// Удаление заявки
const deleteSubmission = async (req, res) => {
    try {
        const { id } = req.params;
        const submission = await submissionService.findById(id);
        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Заявка не найдена',
            });
        }
        await submissionService.delete(id);
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
};
exports.deleteSubmission = deleteSubmission;
// Получение статусов из Битрикс24
const getBitrixStages = async (req, res) => {
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
};
exports.getBitrixStages = getBitrixStages;
// Обновление статуса заявки по Битрикс ID (публичный API)
const updateStatusByBitrixId = async (req, res) => {
    try {
        const { bitrixid, status } = req.query;
        // Валидация параметров
        if (!bitrixid || !status) {
            return res.status(400).json({
                success: false,
                message: 'Параметры bitrixid и status обязательны',
                example: '/api/submissions/update-status?bitrixid=123&status=C1:EXECUTING',
            });
        }
        console.log(`[API UPDATE STATUS] Поиск заявки с bitrixDealId: ${bitrixid}`);
        // Ищем заявку по bitrixDealId
        const submission = await submissionService.findByBitrixDealId(bitrixid);
        if (!submission) {
            return res.status(404).json({
                success: false,
                message: `Заявка с bitrixDealId ${bitrixid} не найдена`,
            });
        }
        console.log(`[API UPDATE STATUS] Заявка найдена: ${submission.submissionNumber}`);
        console.log(`[API UPDATE STATUS] Старый статус: ${submission.status}`);
        console.log(`[API UPDATE STATUS] Новый статус: ${status}`);
        // Обновляем статус
        await submissionService.updateStatus(submission.id, status);
        // Добавляем комментарий
        await submissionService.addComment(submission.id, 'Автоматическое обновление через внешний API', undefined // Системное изменение
        );
        console.log(`[API UPDATE STATUS] Статус успешно обновлен в БД`);
        res.json({
            success: true,
            message: 'Статус заявки обновлен успешно',
            data: {
                submissionNumber: submission.submissionNumber,
                bitrixDealId: submission.bitrixDealId,
                oldStatus: submission.status,
                newStatus: status,
                updatedAt: new Date(),
            },
        });
        console.log(`[API UPDATE STATUS] Ответ отправлен`);
    }
    catch (error) {
        console.error('[API UPDATE STATUS] Ошибка:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера',
            error: error.message,
        });
    }
};
exports.updateStatusByBitrixId = updateStatusByBitrixId;
// Проверка поля UF_CRM_1750107484181 в Битрикс24 (для отладки)
const checkBitrixField = async (req, res) => {
    try {
        const { dealId } = req.params;
        if (!dealId) {
            return res.status(400).json({
                success: false,
                message: 'Параметр dealId обязателен',
            });
        }
        console.log(`[CHECK FIELD] Проверка поля UF_CRM_1750107484181 для сделки ${dealId}`);
        // Получаем данные сделки из Битрикс24
        const dealData = await bitrix24Service_1.default.getDeal(dealId);
        if (!dealData?.result) {
            return res.status(404).json({
                success: false,
                message: `Сделка с ID ${dealId} не найдена в Битрикс24`,
            });
        }
        const fieldValue = dealData.result.UF_CRM_1750107484181;
        console.log(`[CHECK FIELD] Значение поля UF_CRM_1750107484181: ${fieldValue}`);
        res.json({
            success: true,
            data: {
                dealId: dealId,
                fieldValue: fieldValue,
                allFields: dealData.result,
            },
        });
    }
    catch (error) {
        console.error('[CHECK FIELD] Ошибка:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения данных из Битрикс24',
            error: error.message,
        });
    }
};
exports.checkBitrixField = checkBitrixField;
// Копирование заявки
const copySubmission = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        console.log(`[COPY] Копирование заявки ${id} пользователем ${userId}`);
        // Получаем оригинальную заявку
        const originalSubmission = await submissionService.findById(id);
        if (!originalSubmission) {
            return res.status(404).json({
                success: false,
                message: 'Заявка не найдена',
            });
        }
        // Проверяем права доступа - любой авторизованный пользователь может копировать заявки
        const user = await userService.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден',
            });
        }
        console.log(`[COPY] Пользователь ${user.email} копирует заявку ${id}`);
        // Получаем данные формы с полями
        const form = await formService.findWithFields(originalSubmission.formId);
        if (!form) {
            return res.status(404).json({
                success: false,
                message: 'Форма не найдена',
            });
        }
        // Используем ту же логику что и в getSubmissionWithBitrixData
        let formDataFromBitrix = {};
        let preloadedOptions = {};
        if (originalSubmission.bitrixDealId) {
            try {
                console.log(`[COPY] Получение данных из Битрикс24 сделки ${originalSubmission.bitrixDealId}`);
                const dealResponse = await bitrix24Service_1.default.getDeal(originalSubmission.bitrixDealId);
                if (dealResponse?.result) {
                    const dealData = dealResponse.result;
                    console.log(`[COPY] Данные из Битрикс24:`, Object.keys(dealData));
                    // Мапим данные обратно в формат формы
                    for (const field of form.fields) {
                        if (field.bitrixFieldId &&
                            dealData[field.bitrixFieldId] !== undefined) {
                            const bitrixValue = dealData[field.bitrixFieldId];
                            // Для автокомплита полей загружаем названия
                            if (field.type === 'autocomplete' && bitrixValue) {
                                try {
                                    if (field.bitrixEntity === 'product' ||
                                        field.bitrixFieldId === 'UF_CRM_1726227410' ||
                                        field.bitrixFieldId === 'UF_CRM_1726645231') {
                                        console.log(`[COPY] 🔍 Загрузка названия продукта для ID: ${bitrixValue}`);
                                        const productResponse = await bitrix24Service_1.default.getProduct(bitrixValue);
                                        if (productResponse?.result) {
                                            const productName = productResponse.result.NAME;
                                            console.log(`[COPY] 📦 Продукт ${bitrixValue}: "${productName}"`);
                                            // Добавляем в предзагруженные опции
                                            preloadedOptions[field.name] = [
                                                {
                                                    value: bitrixValue,
                                                    label: productName,
                                                },
                                            ];
                                        }
                                    }
                                    else if (field.bitrixEntity === 'contact') {
                                        console.log(`[COPY] 🔍 Загрузка названия контакта для ID: ${bitrixValue}`);
                                        const contactResponse = await bitrix24Service_1.default.getContacts(bitrixValue, 1);
                                        if (contactResponse?.result) {
                                            const contactName = `${contactResponse.result.NAME} ${contactResponse.result.LAST_NAME}`.trim();
                                            console.log(`[COPY] 👤 Контакт ${bitrixValue}: "${contactName}"`);
                                            // Добавляем в предзагруженные опции
                                            preloadedOptions[field.name] = [
                                                {
                                                    value: bitrixValue,
                                                    label: contactName,
                                                },
                                            ];
                                        }
                                    }
                                    else if (field.bitrixEntity === 'company') {
                                        console.log(`[COPY] 🔍 Загрузка названия компании для ID: ${bitrixValue}`);
                                        const companyResponse = await bitrix24Service_1.default.getCompany(bitrixValue);
                                        if (companyResponse?.result) {
                                            const companyName = companyResponse.result.TITLE;
                                            console.log(`[COPY] 🏢 Компания ${bitrixValue}: "${companyName}"`);
                                            // Добавляем в предзагруженные опции
                                            preloadedOptions[field.name] = [
                                                {
                                                    value: bitrixValue,
                                                    label: companyName,
                                                },
                                            ];
                                        }
                                    }
                                }
                                catch (entityError) {
                                    console.error(`[COPY] ❌ Ошибка загрузки сущности ${field.bitrixEntity} ${bitrixValue}:`, entityError);
                                    // Оставляем ID если не удалось загрузить название
                                }
                            }
                            formDataFromBitrix[field.name] = bitrixValue;
                            console.log(`[COPY] ✅ Маппинг ${field.bitrixFieldId} -> ${field.name}:`, bitrixValue);
                        }
                    }
                    console.log('[COPY] FormData восстановлен из Битрикс24:', Object.keys(formDataFromBitrix));
                    console.log('[COPY] Предзагруженные опции:', JSON.stringify(preloadedOptions, null, 2));
                }
                else {
                    console.log('[COPY] Пустой ответ от Битрикс24');
                }
            }
            catch (bitrixError) {
                console.error('[COPY] Ошибка получения данных из Битрикс24:', bitrixError);
                // Продолжаем с пустыми данными
            }
        }
        // Возвращаем данные в том же формате что и getSubmissionWithBitrixData
        res.json({
            success: true,
            message: 'Данные заявки получены для копирования',
            data: {
                formId: originalSubmission.formId,
                formData: formDataFromBitrix, // Данные из Битрикс24
                preloadedOptions: preloadedOptions, // Предзагруженные опции для автокомплита
                originalTitle: originalSubmission.title,
                originalSubmissionNumber: originalSubmission.submissionNumber,
                // НЕ передаем submissionId - это новая заявка
                isCopy: true,
            },
        });
    }
    catch (error) {
        console.error('[COPY] Ошибка копирования заявки:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка копирования заявки',
            error: error.message,
        });
    }
};
exports.copySubmission = copySubmission;
