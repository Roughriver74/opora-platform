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
        // Если токен не предоставлен, пропускаем запрос для публичных маршрутов
        if (!token) {
            req.isAdmin = false;
            return next();
        }
        // Проверяем JWT токен
        const secret = process.env.JWT_SECRET || 'default-jwt-secret-key-change-in-production';
        jsonwebtoken_1.default.verify(token, secret, (err, decoded) => __awaiter(void 0, void 0, void 0, function* () {
            if (err) {
                console.error('Ошибка верификации JWT токена:', err.message);
                req.isAdmin = false;
                req.user = undefined;
                return next();
            }
            try {
                console.log('[AUTH DEBUG] Декодированный токен:', {
                    userId: decoded.userId,
                    id: decoded.id,
                    sub: decoded.sub,
                    iat: decoded.iat,
                    exp: decoded.exp,
                });
                // Проверяем, есть ли пользователь в базе данных
                if (decoded.userId) {
                    // Новая система авторизации - токен содержит userId
                    console.log('[AUTH DEBUG] Поиск пользователя по userId:', decoded.userId);
                    const user = yield User_1.default.findById(decoded.userId);
                    if (user) {
                        console.log('[AUTH DEBUG] Пользователь найден:', {
                            id: user._id,
                            email: user.email,
                            role: user.role,
                            status: user.status,
                        });
                        if (user.status === 'active') {
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
                            console.log('[AUTH DEBUG] Пользователь успешно авторизован:', user.email);
                        }
                        else {
                            console.log('[AUTH DEBUG] Пользователь неактивен:', user.email, 'статус:', user.status);
                            req.isAdmin = false;
                            req.user = undefined;
                        }
                    }
                    else {
                        console.log('[AUTH DEBUG] Пользователь не найден по userId:', decoded.userId);
                        req.isAdmin = false;
                        req.user = undefined;
                    }
                }
                else if (decoded.id || decoded.sub) {
                    // Проверяем альтернативные поля для ID пользователя
                    const userId = decoded.id || decoded.sub;
                    console.log('[AUTH DEBUG] Поиск пользователя по альтернативному ID:', userId);
                    const user = yield User_1.default.findById(userId);
                    if (user) {
                        console.log('[AUTH DEBUG] Пользователь найден (альт. ID):', {
                            id: user._id,
                            email: user.email,
                            role: user.role,
                            status: user.status,
                        });
                        if (user.status === 'active') {
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
                            console.log('[AUTH DEBUG] Пользователь успешно авторизован (альт. ID):', user.email);
                        }
                        else {
                            console.log('[AUTH DEBUG] Пользователь неактивен (альт. ID):', user.email);
                            req.isAdmin = false;
                            req.user = undefined;
                        }
                    }
                    else {
                        console.log('[AUTH DEBUG] Пользователь не найден по альтернативному ID:', userId);
                        req.isAdmin = false;
                        req.user = undefined;
                    }
                }
                else {
                    // Старая система авторизации - проверяем AdminToken
                    console.log('[AUTH DEBUG] Проверка AdminToken для старой системы');
                    const tokenDoc = yield AdminToken_1.default.findOne({ token });
                    if (tokenDoc) {
                        console.log('[AUTH DEBUG] AdminToken найден, авторизация как админ');
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
                        console.log('[AUTH DEBUG] AdminToken не найден');
                        req.isAdmin = false;
                        req.user = undefined;
                    }
                }
            }
            catch (userError) {
                console.error('[AUTH DEBUG] Ошибка получения пользователя:', userError);
                req.isAdmin = false;
                req.user = undefined;
            }
            console.log('[AUTH DEBUG] Финальное состояние:', {
                'req.user': req.user
                    ? `${req.user.id} (${req.user.role})`
                    : 'undefined',
                'req.isAdmin': req.isAdmin,
            });
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
