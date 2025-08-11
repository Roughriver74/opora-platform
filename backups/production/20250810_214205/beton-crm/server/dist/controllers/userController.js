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
exports.syncWithBitrix = exports.updateUserStatus = exports.deleteUser = exports.updateUser = exports.createUser = exports.getUserById = exports.getAllUsers = void 0;
const User_1 = __importDefault(require("../models/User"));
const passwordHash_1 = require("../utils/passwordHash");
const bitrix24Service_1 = __importDefault(require("../services/bitrix24Service"));
/**
 * Получение всех пользователей
 */
const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 10, search = '', role = '', status = '', } = req.query;
        // Строим фильтр
        const filter = {};
        if (search) {
            filter.$or = [
                { email: { $regex: search, $options: 'i' } },
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
            ];
        }
        if (role) {
            filter.role = role;
        }
        if (status) {
            filter.status = status;
        }
        const skip = (Number(page) - 1) * Number(limit);
        const users = yield User_1.default.find(filter)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));
        const total = yield User_1.default.countDocuments(filter);
        res.json({
            success: true,
            data: users,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
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
});
exports.getAllUsers = getAllUsers;
/**
 * Получение пользователя по ID
 */
const getUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const user = yield User_1.default.findById(id).select('-password');
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'Пользователь не найден',
            });
            return;
        }
        res.json({
            success: true,
            data: user,
        });
    }
    catch (error) {
        console.error('Ошибка получения пользователя:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения пользователя',
        });
    }
});
exports.getUserById = getUserById;
/**
 * Создание нового пользователя
 */
const createUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password, role, firstName, lastName, phone, bitrix_id } = req.body;
        // Валидация обязательных полей
        if (!email || !password) {
            res.status(400).json({
                success: false,
                message: 'Email и пароль обязательны',
            });
            return;
        }
        // Проверяем, существует ли пользователь с таким email
        const existingUser = yield User_1.default.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            res.status(400).json({
                success: false,
                message: 'Пользователь с таким email уже существует',
            });
            return;
        }
        // Проверяем, существует ли пользователь с таким bitrix_id (если указан)
        if (bitrix_id) {
            const existingBitrixUser = yield User_1.default.findOne({ bitrix_id });
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
        const user = new User_1.default({
            email: email.toLowerCase(),
            password, // будет хеширован в pre-save хуке
            role: role || 'user',
            firstName,
            lastName,
            phone,
            bitrix_id,
            status: 'active',
        });
        yield user.save();
        // Возвращаем пользователя без пароля
        const userResponse = yield User_1.default.findById(user._id).select('-password');
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
});
exports.createUser = createUser;
/**
 * Обновление пользователя
 */
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { email, password, role, firstName, lastName, phone, bitrix_id, status, } = req.body;
        const user = yield User_1.default.findById(id);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'Пользователь не найден',
            });
            return;
        }
        // Проверяем email на уникальность (если изменился)
        if (email && email.toLowerCase() !== user.email) {
            const existingUser = yield User_1.default.findOne({ email: email.toLowerCase() });
            if (existingUser) {
                res.status(400).json({
                    success: false,
                    message: 'Пользователь с таким email уже существует',
                });
                return;
            }
            user.email = email.toLowerCase();
        }
        // Проверяем bitrix_id на уникальность (если изменился)
        if (bitrix_id && bitrix_id !== user.bitrix_id) {
            const existingBitrixUser = yield User_1.default.findOne({ bitrix_id });
            if (existingBitrixUser) {
                res.status(400).json({
                    success: false,
                    message: 'Пользователь с таким Bitrix ID уже существует',
                });
                return;
            }
            user.bitrix_id = bitrix_id;
        }
        // Обновляем остальные поля
        if (role)
            user.role = role;
        if (firstName !== undefined)
            user.firstName = firstName;
        if (lastName !== undefined)
            user.lastName = lastName;
        if (phone !== undefined)
            user.phone = phone;
        if (status)
            user.status = status;
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
            user.password = password; // будет хеширован в pre-save хуке
        }
        yield user.save();
        // Возвращаем обновленного пользователя без пароля
        const userResponse = yield User_1.default.findById(user._id).select('-password');
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
});
exports.updateUser = updateUser;
/**
 * Удаление пользователя
 */
const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const user = yield User_1.default.findById(id);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'Пользователь не найден',
            });
            return;
        }
        // Проверяем, что не удаляем последнего админа
        if (user.role === 'admin') {
            const adminCount = yield User_1.default.countDocuments({ role: 'admin' });
            if (adminCount <= 1) {
                res.status(400).json({
                    success: false,
                    message: 'Нельзя удалить последнего администратора',
                });
                return;
            }
        }
        yield User_1.default.findByIdAndDelete(id);
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
});
exports.deleteUser = deleteUser;
/**
 * Изменение статуса пользователя
 */
const updateUserStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['active', 'inactive'].includes(status)) {
            res.status(400).json({
                success: false,
                message: 'Неверный статус. Доступны: active, inactive',
            });
            return;
        }
        const user = yield User_1.default.findById(id);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'Пользователь не найден',
            });
            return;
        }
        user.status = status;
        yield user.save();
        // Возвращаем обновленного пользователя без пароля
        const userResponse = yield User_1.default.findById(user._id).select('-password');
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
});
exports.updateUserStatus = updateUserStatus;
/**
 * Синхронизация пользователей с Битрикс24
 */
const syncWithBitrix = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { forceSync = false } = req.body;
        // Получаем всех пользователей из Битрикс24
        const bitrixResponse = yield bitrix24Service_1.default.getUsers();
        const bitrixUsers = (bitrixResponse === null || bitrixResponse === void 0 ? void 0 : bitrixResponse.result) || [];
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
                let user = yield User_1.default.findOne({
                    $or: [
                        { email: email.toLowerCase() },
                        { bitrix_id: bitrixUser.ID || bitrixUser.id },
                    ],
                });
                if (user) {
                    // Обновляем существующего пользователя
                    if (forceSync || !user.bitrix_id) {
                        user.bitrix_id = bitrixUser.ID || bitrixUser.id;
                        user.firstName =
                            bitrixUser.NAME || bitrixUser.firstName || user.firstName;
                        user.lastName =
                            bitrixUser.LAST_NAME || bitrixUser.lastName || user.lastName;
                        user.phone = bitrixUser.WORK_PHONE || bitrixUser.phone || user.phone;
                        yield user.save();
                        updated++;
                    }
                }
                else {
                    // Создаем нового пользователя
                    const newUser = new User_1.default({
                        email: email.toLowerCase(),
                        password: passwordHash_1.PasswordHashService.generateRandomPassword(),
                        role: 'user',
                        firstName: bitrixUser.NAME || bitrixUser.firstName,
                        lastName: bitrixUser.LAST_NAME || bitrixUser.lastName,
                        phone: bitrixUser.WORK_PHONE || bitrixUser.phone,
                        bitrix_id: bitrixUser.ID || bitrixUser.id,
                        status: 'active',
                    });
                    yield newUser.save();
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
});
exports.syncWithBitrix = syncWithBitrix;
