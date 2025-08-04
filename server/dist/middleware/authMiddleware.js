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
exports.requireAuth = exports.requireAdmin = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const AdminToken_1 = __importDefault(require("../models/AdminToken"));
const User_1 = __importDefault(require("../models/User"));
/**
 * Middleware для проверки JWT токена и определения прав администратора
 */
const authMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Получаем токен из заголовков Authorization
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        console.log(`🔍 AuthMiddleware: ${req.method} ${req.path}`);
        console.log(`🔍 Authorization header: ${authHeader ? 'present' : 'missing'}`);
        console.log(`🔍 Token: ${token ? 'present' : 'missing'}`);
        // Если токен не предоставлен, пропускаем запрос для публичных маршрутов
        if (!token) {
            console.log('❌ No token provided');
            req.isAdmin = false;
            return next();
        }
        // Проверяем JWT токен
        const secret = process.env.JWT_SECRET || 'default-jwt-secret-key-change-in-production';
        jsonwebtoken_1.default.verify(token, secret, (err, decoded) => __awaiter(void 0, void 0, void 0, function* () {
            if (err) {
                console.error('❌ Ошибка верификации JWT токена:', err.message);
                req.isAdmin = false;
                req.user = undefined;
                return next();
            }
            console.log('✅ Token verified, decoded:', decoded);
            try {
                // Проверяем, есть ли пользователь в базе данных
                if (decoded.userId) {
                    console.log(`🔍 Looking for user with userId: ${decoded.userId}`);
                    // Новая система авторизации - токен содержит userId
                    // Try with both import styles to debug
                    const user = yield User_1.default.findById(decoded.userId);
                    const UserDynamic = require('../models/User').default;
                    const user2 = yield UserDynamic.findById(decoded.userId);
                    console.log(`🔍 Static import result: ${user ? 'found' : 'not found'}`);
                    console.log(`🔍 Dynamic import result: ${user2 ? 'found' : 'not found'}`);
                    const finalUser = user || user2;
                    if (finalUser) {
                        console.log(`🔍 User status: ${finalUser.status}, isActive: ${finalUser.isActive}`);
                    }
                    if (finalUser && finalUser.status === 'active') {
                        console.log(`✅ User found: ${finalUser.email}, role: ${finalUser.role}`);
                        req.user = {
                            id: finalUser._id.toString(),
                            role: finalUser.role,
                            isAdmin: finalUser.role === 'admin',
                            isUser: finalUser.role === 'user',
                            tokenType: 'access',
                            bitrix_id: finalUser.bitrix_id,
                            settings: finalUser.settings,
                        };
                        req.isAdmin = finalUser.role === 'admin';
                    }
                    else {
                        console.log(`❌ User not found or inactive for userId: ${decoded.userId}`);
                        req.isAdmin = false;
                        req.user = undefined;
                    }
                }
                else {
                    // Проверяем альтернативные поля для ID пользователя
                    const userId = decoded.id || decoded.sub;
                    const user = yield User_1.default.findById(userId);
                    if (user && user.status === 'active') {
                        req.user = {
                            id: user._id.toString(),
                            role: user.role,
                            isAdmin: user.role === 'admin',
                            isUser: user.role === 'user',
                            tokenType: 'access',
                            bitrix_id: user.bitrix_id,
                            settings: user.settings,
                        };
                        req.isAdmin = user.role === 'admin';
                    }
                    else {
                        // Старая система авторизации - проверяем AdminToken
                        const tokenDoc = yield AdminToken_1.default.findOne({ token });
                        if (tokenDoc) {
                            req.isAdmin = true;
                            // Создаем минимальный объект пользователя для админа
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
                }
            }
            catch (userError) {
                console.error('❌ Ошибка получения пользователя:', userError);
                req.isAdmin = false;
                req.user = undefined;
            }
            console.log(`🔍 Final req.user: ${req.user ? 'set' : 'undefined'}`);
            console.log(`🔍 Final req.isAdmin: ${req.isAdmin}`);
            next();
        }));
    }
    catch (error) {
        console.error('Ошибка в middleware авторизации:', error);
        req.isAdmin = false;
        next();
    }
});
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
