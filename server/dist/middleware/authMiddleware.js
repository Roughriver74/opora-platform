"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = exports.requireAdmin = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_config_1 = require("../database/config/database.config");
const AdminToken_entity_1 = require("../database/entities/AdminToken.entity");
const UserService_1 = require("../services/UserService");
const userService = (0, UserService_1.getUserService)();
/**
 * Middleware для проверки JWT токена и определения прав администратора
 */
const authMiddleware = async (req, res, next) => {
    try {
        // Получаем токен из заголовков Authorization
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        // Если токен не предоставлен, пропускаем запрос для публичных маршрутов
        if (!token) {
            req.isAdmin = false;
            return next();
        }
        // Проверяем JWT токен
        const secret = process.env.JWT_SECRET || 'default-jwt-secret-key-change-in-production';
        jsonwebtoken_1.default.verify(token, secret, async (err, decoded) => {
            if (err) {
                console.error('❌ Ошибка верификации JWT токена:', err.message);
                req.isAdmin = false;
                req.user = undefined;
                return next();
            }
            try {
                // Проверяем тип токена
                if (decoded.adminId) {
                    // Токен администратора
                    const tokenRepository = database_config_1.AppDataSource.getRepository(AdminToken_entity_1.AdminToken);
                    const storedToken = await tokenRepository.findOne({
                        where: { token },
                        relations: ['user']
                    });
                    if (storedToken && storedToken.isValid()) {
                        // Обновляем время последнего использования
                        storedToken.markAsUsed();
                        await tokenRepository.save(storedToken);
                        req.isAdmin = true;
                        req.user = {
                            id: 'admin',
                            role: 'admin',
                            isAdmin: true,
                            isUser: false,
                            tokenType: 'access',
                        };
                    }
                    else {
                        req.isAdmin = false;
                        req.user = undefined;
                    }
                }
                else {
                    // Токен пользователя
                    const userId = decoded.id || decoded.userId || decoded.sub;
                    const user = await userService.findById(userId);
                    if (user && user.isActive) {
                        req.user = {
                            id: user.id,
                            role: user.role,
                            isAdmin: user.role === 'admin',
                            isUser: user.role === 'user',
                            tokenType: 'access',
                            bitrixUserId: user.bitrixUserId,
                            settings: user.settings,
                        };
                        req.isAdmin = user.role === 'admin';
                    }
                    else {
                        req.isAdmin = false;
                        req.user = undefined;
                    }
                }
            }
            catch (userError) {
                console.error('❌ Ошибка получения пользователя:', userError);
                req.isAdmin = false;
                req.user = undefined;
            }
            next();
        });
    }
    catch (error) {
        console.error('Ошибка в middleware авторизации:', error);
        req.isAdmin = false;
        next();
    }
};
exports.authMiddleware = authMiddleware;
/**
 * Middleware для проверки прав администратора
 * Используется после authMiddleware для защищенных маршрутов
 */
const requireAdmin = (req, res, next) => {
    if (!req.isAdmin) {
        res.status(401).json({
            success: false,
            message: 'Требуются права администратора',
        });
        return;
    }
    next();
};
exports.requireAdmin = requireAdmin;
/**
 * Middleware для проверки авторизации (любая роль)
 */
const requireAuth = (req, res, next) => {
    // Проверяем, есть ли авторизованный пользователь или админ
    if (!req.user) {
        res.status(401).json({
            success: false,
            message: 'Требуется авторизация',
        });
        return;
    }
    next();
};
exports.requireAuth = requireAuth;
