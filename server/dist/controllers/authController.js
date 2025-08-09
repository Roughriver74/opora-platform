"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshToken = exports.logout = exports.verifyToken = exports.userLogin = exports.adminLogin = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const UserService_1 = require("../services/UserService");
const database_config_1 = require("../database/config/database.config");
const AdminToken_entity_1 = require("../database/entities/AdminToken.entity");
const userService = (0, UserService_1.getUserService)();
/**
 * Логин администратора
 */
const adminLogin = async (req, res) => {
    try {
        const { username, password } = req.body;
        // Проверяем учетные данные администратора
        const adminUsername = process.env.ADMIN_USERNAME || 'admin';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
        if (username !== adminUsername || password !== adminPassword) {
            res.status(401).json({
                success: false,
                message: 'Неверные учетные данные',
            });
            return;
        }
        // Генерируем токены
        const secret = process.env.JWT_SECRET || 'default-jwt-secret-key-change-in-production';
        const accessToken = jsonwebtoken_1.default.sign({ adminId: 'admin', email: 'admin@beton.com' }, secret, { expiresIn: '4h' });
        const refreshToken = jsonwebtoken_1.default.sign({ adminId: 'admin', email: 'admin@beton.com' }, secret, { expiresIn: '7d' });
        // Сохраняем токен в базу
        const tokenRepository = database_config_1.AppDataSource.getRepository(AdminToken_entity_1.AdminToken);
        const adminToken = AdminToken_entity_1.AdminToken.createToken('admin', 'Admin login', 7);
        adminToken.token = accessToken;
        await tokenRepository.save(adminToken);
        // Очищаем старые токены
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        await tokenRepository
            .createQueryBuilder()
            .delete()
            .where('createdAt < :date', { date: sevenDaysAgo })
            .execute();
        res.json({
            success: true,
            accessToken,
            refreshToken,
            user: {
                role: 'admin',
                email: 'admin@beton.com',
            },
        });
    }
    catch (error) {
        console.error('Ошибка при логине администратора:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера',
        });
    }
};
exports.adminLogin = adminLogin;
/**
 * Логин пользователя
 */
const userLogin = async (req, res) => {
    console.log(`🔑 User login - URL: ${req.originalUrl}, Method: ${req.method}`);
    console.log(`🔑 Request headers:`, req.headers);
    try {
        const { email, password } = req.body;
        console.log(`🔍 Login attempt for email: ${email}`);
        // Используем сервис для аутентификации
        const authResult = await userService.login({ email, password });
        if (!authResult) {
            console.log('❌ Authentication failed');
            res.status(401).json({
                success: false,
                message: 'Неверный email или пароль',
            });
            return;
        }
        console.log('✅ Authentication successful');
        res.json({
            success: true,
            accessToken: authResult.token,
            refreshToken: authResult.token, // В реальном приложении нужен отдельный refresh token
            user: authResult.user,
        });
    }
    catch (error) {
        console.error('Ошибка при логине пользователя:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Внутренняя ошибка сервера',
        });
    }
};
exports.userLogin = userLogin;
/**
 * Проверка токена
 */
const verifyToken = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            res.status(401).json({
                success: false,
                message: 'Токен отсутствует',
            });
            return;
        }
        const secret = process.env.JWT_SECRET || 'default-jwt-secret-key-change-in-production';
        jsonwebtoken_1.default.verify(token, secret, async (err, decoded) => {
            if (err) {
                res.status(401).json({
                    success: false,
                    message: 'Токен недействителен',
                });
                return;
            }
            // Проверяем тип токена
            if (decoded.id || decoded.userId) {
                // Токен пользователя
                const userId = decoded.id || decoded.userId;
                const user = await userService.findById(userId);
                if (!user || !user.isActive) {
                    res.status(401).json({
                        success: false,
                        message: 'Пользователь не найден или неактивен',
                    });
                    return;
                }
                // Безопасно извлекаем данные пользователя
                const safeUser = user.toSafeObject ? user.toSafeObject() : {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    phone: user.phone,
                    role: user.role,
                    isActive: user.isActive,
                    settings: user.settings,
                    lastLogin: user.lastLogin,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                    fullName: user.fullName
                };
                res.json({
                    success: true,
                    message: 'Токен действителен',
                    user: safeUser,
                });
            }
            else if (decoded.adminId) {
                // Токен администратора
                const tokenRepository = database_config_1.AppDataSource.getRepository(AdminToken_entity_1.AdminToken);
                const storedToken = await tokenRepository.findOne({
                    where: { token },
                    relations: ['user']
                });
                if (!storedToken || !storedToken.isValid()) {
                    res.status(401).json({
                        success: false,
                        message: 'Токен недействителен',
                    });
                    return;
                }
                // Обновляем время последнего использования
                storedToken.markAsUsed();
                await tokenRepository.save(storedToken);
                res.json({
                    success: true,
                    message: 'Токен действителен',
                    user: {
                        role: 'admin',
                        email: 'admin@beton.com',
                    },
                });
            }
            else {
                res.status(401).json({
                    success: false,
                    message: 'Неизвестный тип токена',
                });
            }
        });
    }
    catch (error) {
        console.error('Ошибка проверки токена:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера',
        });
    }
};
exports.verifyToken = verifyToken;
/**
 * Logout - отзыв токена
 */
const logout = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (token) {
            // Удаляем токен из базы данных
            const tokenRepository = database_config_1.AppDataSource.getRepository(AdminToken_entity_1.AdminToken);
            await tokenRepository.delete({ token });
        }
        res.json({
            success: true,
            message: 'Выход выполнен успешно',
        });
    }
    catch (error) {
        console.error('Ошибка при выходе:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера',
        });
    }
};
exports.logout = logout;
/**
 * Обновление токена доступа
 */
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            res.status(401).json({
                success: false,
                message: 'Refresh token отсутствует',
            });
            return;
        }
        const secret = process.env.JWT_SECRET || 'default-jwt-secret-key-change-in-production';
        jsonwebtoken_1.default.verify(refreshToken, secret, async (err, decoded) => {
            if (err) {
                res.status(401).json({
                    success: false,
                    message: 'Refresh token недействителен',
                });
                return;
            }
            // Проверяем тип токена и получаем пользователя
            let tokenPayload = null;
            if (decoded.id || decoded.userId) {
                const userId = decoded.id || decoded.userId;
                const user = await userService.findById(userId);
                if (!user || !user.isActive) {
                    res.status(401).json({
                        success: false,
                        message: 'Пользователь не найден или неактивен',
                    });
                    return;
                }
                tokenPayload = {
                    userId: user.id,
                    id: user.id,
                    email: user.email,
                    role: user.role,
                };
            }
            else if (decoded.adminId) {
                // Для админа
                tokenPayload = {
                    adminId: decoded.adminId,
                    email: decoded.email,
                };
            }
            else {
                res.status(401).json({
                    success: false,
                    message: 'Не удалось определить пользователя',
                });
                return;
            }
            // Генерируем новые токены
            const newAccessToken = jsonwebtoken_1.default.sign(tokenPayload, secret, { expiresIn: '4h' });
            const newRefreshToken = jsonwebtoken_1.default.sign(tokenPayload, secret, { expiresIn: '7d' });
            res.json({
                success: true,
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            });
        });
    }
    catch (error) {
        console.error('Ошибка при обновлении токена:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Ошибка сервера при обновлении токена',
        });
    }
};
exports.refreshToken = refreshToken;
