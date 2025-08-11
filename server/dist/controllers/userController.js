"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncWithBitrix = exports.updateUserSettings = exports.updateUserStatus = exports.deleteUser = exports.updateUser = exports.createUser = exports.getUserById = exports.getAllUsers = void 0;
const UserService_1 = require("../services/UserService");
const passwordHash_1 = require("../utils/passwordHash");
const bitrix24Service_1 = __importDefault(require("../services/bitrix24Service"));
const User_entity_1 = require("../database/entities/User.entity");
const userService = (0, UserService_1.getUserService)();
/**
 * Получение всех пользователей с пагинацией и фильтрацией
 */
const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', role = '', status = '', } = req.query;
        const filters = {};
        if (search && typeof search === 'string') {
            filters.search = search;
        }
        if (role && typeof role === 'string' && Object.values(User_entity_1.UserRole).includes(role)) {
            filters.role = role;
        }
        if (status && typeof status === 'string' && Object.values(User_entity_1.UserStatus).includes(status)) {
            filters.status = status;
        }
        const result = await userService.findWithPaginationAndFilters(Number(page), Number(limit), filters);
        res.json({
            success: true,
            data: result.data,
            pagination: {
                page: result.page,
                limit: result.limit,
                total: result.total,
                pages: result.pages,
            },
        });
    }
    catch (error) {
        console.error('Ошибка получения пользователей:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения пользователей',
        });
    }
};
exports.getAllUsers = getAllUsers;
/**
 * Получение пользователя по ID
 */
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await userService.findById(id);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'Пользователь не найден',
            });
            return;
        }
        // Возвращаем пользователя без пароля
        const { password, ...userWithoutPassword } = user;
        res.json({
            success: true,
            data: userWithoutPassword,
        });
    }
    catch (error) {
        console.error('Ошибка получения пользователя:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения пользователя',
        });
    }
};
exports.getUserById = getUserById;
/**
 * Создание нового пользователя
 */
const createUser = async (req, res) => {
    try {
        const { email, password, role, firstName, lastName, phone, bitrixUserId } = req.body;
        // Валидация обязательных полей
        if (!email || !password) {
            res.status(400).json({
                success: false,
                message: 'Email и пароль обязательны',
            });
            return;
        }
        // Проверяем, существует ли пользователь с таким email
        const existingUser = await userService.findByEmail(email);
        if (existingUser) {
            res.status(400).json({
                success: false,
                message: 'Пользователь с таким email уже существует',
            });
            return;
        }
        // Проверяем, существует ли пользователь с таким bitrixUserId (если указан)
        if (bitrixUserId) {
            const existingBitrixUser = await userService.findByBitrixUserId(bitrixUserId);
            if (existingBitrixUser) {
                res.status(400).json({
                    success: false,
                    message: 'Пользователь с таким Bitrix ID уже существует',
                });
                return;
            }
        }
        // Валидация пароля
        const passwordValidation = passwordHash_1.PasswordHashService.validatePassword(password);
        if (!passwordValidation.isValid) {
            res.status(400).json({
                success: false,
                message: passwordValidation.message,
            });
            return;
        }
        // Создаем пользователя
        const userData = {
            email: email.toLowerCase(),
            password, // будет захеширован в entity
            role: role || User_entity_1.UserRole.USER,
            firstName,
            lastName,
            phone,
            bitrixUserId,
        };
        const user = await userService.createUser(userData);
        // Возвращаем пользователя без пароля
        const { password: _, ...userResponse } = user;
        res.status(201).json({
            success: true,
            data: userResponse,
            message: 'Пользователь успешно создан',
        });
    }
    catch (error) {
        console.error('Ошибка создания пользователя:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка создания пользователя',
        });
    }
};
exports.createUser = createUser;
/**
 * Обновление пользователя
 */
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, password, role, firstName, lastName, phone, bitrixUserId, status, } = req.body;
        const user = await userService.findById(id);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'Пользователь не найден',
            });
            return;
        }
        // Проверяем email на уникальность (если изменился)
        if (email && email.toLowerCase() !== user.email) {
            const existingUser = await userService.findByEmail(email);
            if (existingUser) {
                res.status(400).json({
                    success: false,
                    message: 'Пользователь с таким email уже существует',
                });
                return;
            }
        }
        // Проверяем bitrixUserId на уникальность (если изменился)
        if (bitrixUserId && bitrixUserId !== user.bitrixUserId) {
            const existingBitrixUser = await userService.findByBitrixUserId(bitrixUserId);
            if (existingBitrixUser) {
                res.status(400).json({
                    success: false,
                    message: 'Пользователь с таким Bitrix ID уже существует',
                });
                return;
            }
        }
        // Подготавливаем данные для обновления
        const updateData = {};
        if (email)
            updateData.email = email.toLowerCase();
        if (role)
            updateData.role = role;
        if (firstName !== undefined)
            updateData.firstName = firstName;
        if (lastName !== undefined)
            updateData.lastName = lastName;
        if (phone !== undefined)
            updateData.phone = phone;
        if (status)
            updateData.status = status;
        if (bitrixUserId !== undefined)
            updateData.bitrixUserId = bitrixUserId;
        // Обновляем пароль, если указан
        if (password) {
            const passwordValidation = passwordHash_1.PasswordHashService.validatePassword(password);
            if (!passwordValidation.isValid) {
                res.status(400).json({
                    success: false,
                    message: passwordValidation.message,
                });
                return;
            }
            updateData.password = password; // будет захеширован в entity
        }
        const updatedUser = await userService.updateUser(id, updateData);
        // Возвращаем обновленного пользователя без пароля
        const { password: _, ...userResponse } = updatedUser;
        res.json({
            success: true,
            data: userResponse,
            message: 'Пользователь успешно обновлен',
        });
    }
    catch (error) {
        console.error('Ошибка обновления пользователя:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка обновления пользователя',
        });
    }
};
exports.updateUser = updateUser;
/**
 * Удаление пользователя
 */
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await userService.findById(id);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'Пользователь не найден',
            });
            return;
        }
        // Проверяем, что не удаляем последнего админа
        if (user.role === User_entity_1.UserRole.ADMIN) {
            const adminUsers = await userService.findAdmins();
            if (adminUsers.length <= 1) {
                res.status(400).json({
                    success: false,
                    message: 'Нельзя удалить последнего администратора',
                });
                return;
            }
        }
        const deleted = await userService.delete(id);
        if (!deleted) {
            res.status(500).json({
                success: false,
                message: 'Не удалось удалить пользователя',
            });
            return;
        }
        res.json({
            success: true,
            message: 'Пользователь успешно удален',
        });
    }
    catch (error) {
        console.error('Ошибка удаления пользователя:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка удаления пользователя',
        });
    }
};
exports.deleteUser = deleteUser;
/**
 * Изменение статуса пользователя
 */
const updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!Object.values(User_entity_1.UserStatus).includes(status)) {
            res.status(400).json({
                success: false,
                message: `Неверный статус. Доступны: ${Object.values(User_entity_1.UserStatus).join(', ')}`,
            });
            return;
        }
        const user = await userService.findById(id);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'Пользователь не найден',
            });
            return;
        }
        const updatedUser = await userService.updateUser(id, { status });
        // Возвращаем обновленного пользователя без пароля
        const { password: _, ...userResponse } = updatedUser;
        res.json({
            success: true,
            data: userResponse,
            message: `Статус пользователя изменен на ${status}`,
        });
    }
    catch (error) {
        console.error('Ошибка изменения статуса пользователя:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка изменения статуса пользователя',
        });
    }
};
exports.updateUserStatus = updateUserStatus;
/**
 * Обновление настроек пользователя
 */
const updateUserSettings = async (req, res) => {
    try {
        const { userId } = req.params;
        const { settings } = req.body;
        // Проверяем, что пользователь может изменять только свои настройки или он админ
        const currentUser = req.user;
        if (!currentUser || (currentUser.id !== userId && !currentUser.isAdmin)) {
            res.status(403).json({
                success: false,
                message: 'Недостаточно прав для изменения настроек',
            });
            return;
        }
        const user = await userService.findById(userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'Пользователь не найден',
            });
            return;
        }
        const updatedUser = await userService.updateSettings(userId, settings);
        res.json({
            success: true,
            data: updatedUser?.settings,
            message: 'Настройки пользователя обновлены',
        });
    }
    catch (error) {
        console.error('Ошибка обновления настроек пользователя:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка обновления настроек пользователя',
        });
    }
};
exports.updateUserSettings = updateUserSettings;
/**
 * Синхронизация пользователей с Битрикс24
 */
const syncWithBitrix = async (req, res) => {
    try {
        const { forceSync = false } = req.body;
        // Получаем всех пользователей из Битрикс24
        const bitrixResponse = await bitrix24Service_1.default.getUsers();
        const bitrixUsers = bitrixResponse?.result || [];
        if (!bitrixUsers || bitrixUsers.length === 0) {
            res.status(400).json({
                success: false,
                message: 'Не удалось получить пользователей из Битрикс24',
            });
            return;
        }
        let created = 0;
        let updated = 0;
        let errors = 0;
        for (const bitrixUser of bitrixUsers) {
            try {
                const email = bitrixUser.EMAIL || bitrixUser.email;
                if (!email)
                    continue;
                // Ищем пользователя по email или bitrix_id
                let user = await userService.findByEmail(email) ||
                    await userService.findByBitrixUserId(bitrixUser.ID || bitrixUser.id);
                if (user) {
                    // Обновляем существующего пользователя
                    if (forceSync || !user.bitrixUserId) {
                        await userService.updateUser(user.id, {
                            firstName: bitrixUser.NAME || bitrixUser.firstName || user.firstName,
                            lastName: bitrixUser.LAST_NAME || bitrixUser.lastName || user.lastName,
                            phone: bitrixUser.WORK_PHONE || bitrixUser.phone || user.phone,
                        });
                        // Отдельно обновляем bitrixUserId
                        await userService.userRepository.update(user.id, {
                            bitrixUserId: bitrixUser.ID || bitrixUser.id
                        });
                        updated++;
                    }
                }
                else {
                    // Создаем нового пользователя
                    await userService.createUser({
                        email: email.toLowerCase(),
                        password: passwordHash_1.PasswordHashService.generateRandomPassword(),
                        role: User_entity_1.UserRole.USER,
                        firstName: bitrixUser.NAME || bitrixUser.firstName,
                        lastName: bitrixUser.LAST_NAME || bitrixUser.lastName,
                        phone: bitrixUser.WORK_PHONE || bitrixUser.phone,
                    });
                    // После создания обновляем bitrixUserId
                    const newUser = await userService.findByEmail(email);
                    if (newUser) {
                        await userService.userRepository.update(newUser.id, {
                            bitrixUserId: bitrixUser.ID || bitrixUser.id
                        });
                    }
                    created++;
                }
            }
            catch (error) {
                console.error('Ошибка синхронизации пользователя:', error);
                errors++;
            }
        }
        res.json({
            success: true,
            message: 'Синхронизация завершена',
            stats: {
                created,
                updated,
                errors,
                total: bitrixUsers.length,
            },
        });
    }
    catch (error) {
        console.error('Ошибка синхронизации с Битрикс24:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка синхронизации с Битрикс24',
        });
    }
};
exports.syncWithBitrix = syncWithBitrix;
