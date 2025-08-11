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
        const form = await formService.findWithFields(formId);
        if (!form) {
            return res.status(404).json({ message: 'Форма не найдена' });
        }
        if (!form.isActive) {
            return res.status(400).json({ message: 'Форма не активна' });
        }
        const validation = await formService.validateFormData(formId, formData);
        if (!validation.isValid) {
            return res.status(400).json({
                message: 'Ошибка валидации данных',
                errors: validation.errors,
            });
        }
        const dealData = {};
        let dealTitle = `Заявка ${Date.now()}`;
        for (const field of form.fields) {
            if (formData[field.name] !== undefined && field.bitrixFieldId) {
                const value = formData[field.name];
                dealData[field.bitrixFieldId] = value;
                if (field.bitrixFieldId === 'TITLE' && value) {
                    dealTitle = value;
                }
            }
        }
        dealData.TITLE = dealTitle;
        dealData.STAGE_ID = 'C1:NEW';
        if (req.user?.id) {
            const user = await userService.findById(req.user.id);
            if (user && user.bitrixUserId) {
                dealData.ASSIGNED_BY_ID = user.bitrixUserId;
            }
        }
        const categoryId = form.bitrixDealCategory || '1';
        dealData.CATEGORY_ID = categoryId;
        let submission = null;
        try {
            const submissionData = {
                formId: formId,
                userId: req.user?.id,
                title: dealTitle,
                notes: 'Заявка создана через форму',
            };
            submission = await submissionService.createSubmission(submissionData);
            dealData.UF_CRM_1750107484181 = submission.id;
            const dealResponse = await bitrix24Service_1.default.createDeal(dealData);
            await submissionService.updateSyncStatus(submission.id, Submission_entity_1.BitrixSyncStatus.SYNCED, dealResponse.result?.toString?.());
            return res.status(200).json({
                success: true,
                message: form.successMessage || 'Спасибо! Ваша заявка успешно отправлена.',
                submissionId: submission.id,
                submissionNumber: submission.submissionNumber,
                dealId: dealResponse.result?.toString?.(),
            });
        }
        catch (bitrixError) {
            if (submission && submission.id) {
                try {
                    await submissionService.delete(submission.id);
                }
                catch { }
            }
            return res.status(500).json({
                message: 'Ошибка создания заявки в системе',
                error: bitrixError?.message,
            });
        }
    }
    catch (error) {
        return res.status(500).json({
            message: 'Произошла ошибка при обработке заявки',
            error: error?.message,
        });
    }
};
exports.submitForm = submitForm;
// Получение всех заявок (для админов)
const getAllSubmissions = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, priority, assignedTo, userId, dateFrom, dateTo, search, tags, formId, bitrixSyncStatus, sortBy = 'createdAt', sortOrder = 'desc', } = req.query;
        // Подготовка фильтров
        const filters = {
            status: status,
            priority: priority,
            assignedToId: assignedTo,
            userId: userId,
            dateFrom: dateFrom ? new Date(dateFrom) : undefined,
            dateTo: dateTo ? new Date(dateTo) : undefined,
            search: search,
            tags: Array.isArray(tags)
                ? tags
                : tags
                    ? [tags]
                    : undefined,
            formId: formId,
            bitrixSyncStatus: bitrixSyncStatus,
        };
        // Подготовка пагинации
        const pagination = {
            page: Number(page),
            limit: Number(limit),
            sortBy: sortBy,
            sortOrder: sortOrder.toUpperCase(),
        };
        // Используем сервис для получения заявок
        const result = await submissionService.searchSubmissions({
            ...filters,
            ...pagination,
        });
        res.status(200).json({
            success: true,
            ...result,
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
            tags: Array.isArray(tags)
                ? tags
                : tags
                    ? [tags]
                    : undefined,
        };
        // Подготовка пагинации
        const pagination = {
            page: Number(page),
            limit: Number(limit),
            sortBy: 'createdAt',
            sortOrder: 'desc',
        };
        const result = await submissionService.getUserSubmissions(userId, filters);
        res.json({
            success: true,
            ...result,
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
        const submission = await submissionService.findById(id);
        if (!submission) {
            return res
                .status(404)
                .json({ success: false, message: 'Заявка не найдена' });
        }
        const isAdmin = req.isAdmin;
        if (!isAdmin && submission.userId !== userId) {
            return res
                .status(403)
                .json({ success: false, message: 'Нет прав доступа' });
        }
        let formDataFromBitrix = {};
        let preloadedOptions = {};
        try {
            if (submission.bitrixDealId) {
                const dealResponse = await bitrix24Service_1.default.getDeal(submission.bitrixDealId);
                const dealData = dealResponse?.result || {};
                const form = await formService.findWithFields(submission.formId);
                if (form) {
                    for (const field of form.fields) {
                        if (field.bitrixFieldId) {
                            const bitrixValue = dealData[field.bitrixFieldId];
                            if (bitrixValue !== undefined) {
                                formDataFromBitrix[field.name] = bitrixValue;
                                if (field.type === 'autocomplete' &&
                                    field.dynamicSource?.enabled) {
                                    try {
                                        if (field.dynamicSource.source === 'products') {
                                            const productResponse = await bitrix24Service_1.default.getProduct(String(bitrixValue));
                                            const productName = productResponse?.result?.NAME;
                                            if (productName) {
                                                preloadedOptions[field.name] = [
                                                    { value: bitrixValue, label: productName },
                                                ];
                                            }
                                        }
                                        else if (field.dynamicSource.source === 'companies') {
                                            const companyResponse = await bitrix24Service_1.default.getCompany(String(bitrixValue));
                                            const companyName = companyResponse?.result?.TITLE;
                                            if (companyName) {
                                                preloadedOptions[field.name] = [
                                                    { value: bitrixValue, label: companyName },
                                                ];
                                            }
                                        }
                                    }
                                    catch { }
                                }
                            }
                        }
                    }
                }
            }
            await submissionService.updateSyncStatus(submission.id, Submission_entity_1.BitrixSyncStatus.SYNCED);
        }
        catch (bitrixError) {
            await submissionService.updateSyncStatus(submission.id, Submission_entity_1.BitrixSyncStatus.FAILED, undefined, bitrixError?.message);
            formDataFromBitrix = {};
        }
        const responseData = {
            id: submission.id,
            formId: submission.formId,
            formData: formDataFromBitrix,
            preloadedOptions,
        };
        return res.json({ success: true, data: responseData });
    }
    catch (error) {
        return res
            .status(500)
            .json({ success: false, message: 'Ошибка получения заявки' });
    }
};
exports.getSubmissionWithBitrixData = getSubmissionWithBitrixData;
// Обновление заявки - сразу в Битрикс24
const updateSubmission = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const userId = req.user?.id;
        const submission = await submissionService.findById(id);
        if (!submission) {
            return res
                .status(404)
                .json({ success: false, message: 'Заявка не найдена' });
        }
        const isAdmin = req.isAdmin;
        if (!isAdmin && submission.userId !== userId) {
            return res
                .status(403)
                .json({
                success: false,
                message: 'Нет прав для редактирования этой заявки',
            });
        }
        try {
            const form = await formService.findWithFields(submission.formId);
            if (!form) {
                throw new Error('Форма не найдена');
            }
            const dealData = {};
            let newTitle = submission.title;
            for (const field of form.fields) {
                if (updateData[field.name] !== undefined && field.bitrixFieldId) {
                    const value = updateData[field.name];
                    dealData[field.bitrixFieldId] = value;
                    if (field.bitrixFieldId === 'TITLE' && value) {
                        newTitle = value;
                    }
                }
            }
            await bitrix24Service_1.default.updateDeal(submission.bitrixDealId, dealData);
            await submissionService.updateSubmission(id, { title: newTitle }, userId);
            await submissionService.updateSyncStatus(id, Submission_entity_1.BitrixSyncStatus.SYNCED);
            return res.json({
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
            await submissionService.updateSyncStatus(id, Submission_entity_1.BitrixSyncStatus.FAILED, undefined, bitrixError?.message);
            return res.status(500).json({
                success: false,
                message: 'Ошибка обновления заявки в Битрикс24',
                error: bitrixError?.message,
            });
        }
    }
    catch (error) {
        return res
            .status(500)
            .json({ success: false, message: 'Ошибка обновления заявки' });
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
        // Ищем заявку по bitrixDealId
        const submission = await submissionService.findByBitrixDealId(bitrixid);
        if (!submission) {
            return res.status(404).json({
                success: false,
                message: `Заявка с bitrixDealId ${bitrixid} не найдена`,
            });
        }
        // Обновляем статус
        await submissionService.updateStatus(submission.id, status);
        // Добавляем комментарий
        await submissionService.addComment(submission.id, 'Автоматическое обновление через внешний API', undefined // Системное изменение
        );
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
        // Получаем данные сделки из Битрикс24
        const dealData = await bitrix24Service_1.default.getDeal(dealId);
        if (!dealData?.result) {
            return res.status(404).json({
                success: false,
                message: `Сделка с ID ${dealId} не найдена в Битрикс24`,
            });
        }
        const fieldValue = dealData.result.UF_CRM_1750107484181;
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
        const originalSubmission = await submissionService.findById(id);
        if (!originalSubmission) {
            return res
                .status(404)
                .json({ success: false, message: 'Заявка не найдена' });
        }
        const user = userId ? await userService.findById(userId) : null;
        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: 'Пользователь не найден' });
        }
        const form = await formService.findWithFields(originalSubmission.formId);
        if (!form) {
            return res
                .status(404)
                .json({ success: false, message: 'Форма не найдена' });
        }
        let formDataFromBitrix = {};
        let preloadedOptions = {};
        if (originalSubmission.bitrixDealId) {
            try {
                const dealResponse = await bitrix24Service_1.default.getDeal(originalSubmission.bitrixDealId);
                const dealData = dealResponse?.result || {};
                for (const field of form.fields) {
                    if (field.bitrixFieldId &&
                        dealData[field.bitrixFieldId] !== undefined) {
                        const bitrixValue = dealData[field.bitrixFieldId];
                        formDataFromBitrix[field.name] = bitrixValue;
                        if (field.type === 'autocomplete' && bitrixValue) {
                            try {
                                if (field.bitrixEntity === 'product') {
                                    const productResponse = await bitrix24Service_1.default.getProduct(String(bitrixValue));
                                    const productName = productResponse?.result?.NAME;
                                    if (productName) {
                                        preloadedOptions[field.name] = [
                                            { value: bitrixValue, label: productName },
                                        ];
                                    }
                                }
                                else if (field.bitrixEntity === 'contact') {
                                    const contactResponse = await bitrix24Service_1.default.getContacts(String(bitrixValue), 1);
                                    const first = Array.isArray(contactResponse?.result)
                                        ? contactResponse.result[0]
                                        : contactResponse?.result;
                                    const contactName = first
                                        ? `${first.NAME || ''} ${first.LAST_NAME || ''}`.trim()
                                        : '';
                                    if (contactName) {
                                        preloadedOptions[field.name] = [
                                            { value: bitrixValue, label: contactName },
                                        ];
                                    }
                                }
                                else if (field.bitrixEntity === 'company') {
                                    const companyResponse = await bitrix24Service_1.default.getCompany(String(bitrixValue));
                                    const companyName = companyResponse?.result?.TITLE;
                                    if (companyName) {
                                        preloadedOptions[field.name] = [
                                            { value: bitrixValue, label: companyName },
                                        ];
                                    }
                                }
                            }
                            catch { }
                        }
                    }
                }
            }
            catch { }
        }
        return res.json({
            success: true,
            message: 'Данные заявки получены для копирования',
            data: {
                formId: originalSubmission.formId,
                formData: formDataFromBitrix,
                preloadedOptions,
                originalTitle: originalSubmission.title,
                originalSubmissionNumber: originalSubmission.submissionNumber,
                isCopy: true,
            },
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Ошибка копирования заявки',
            error: error?.message,
        });
    }
};
exports.copySubmission = copySubmission;
