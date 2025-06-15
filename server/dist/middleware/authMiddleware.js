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
                req.isAdmin = false;
                return next();
            }
            // Проверяем, есть ли пользователь в базе данных
            if (decoded.userId) {
                // Новая система авторизации - токен содержит userId
                try {
                    const user = yield User_1.default.findById(decoded.userId);
                    if (user && user.status === 'active') {
                        req.user = {
                            id: user._id.toString(),
                            role: user.role,
                            isAdmin: user.role === 'admin',
                            isUser: user.role === 'user',
                            tokenType: 'access',
                        };
                        req.isAdmin = user.role === 'admin';
                    }
                    else {
                        req.isAdmin = false;
                    }
                }
                catch (userError) {
                    console.error('Ошибка получения пользователя:', userError);
                    req.isAdmin = false;
                }
            }
            else {
                // Старая система авторизации - проверяем AdminToken
                const tokenDoc = yield AdminToken_1.default.findOne({ token });
                if (tokenDoc) {
                    req.isAdmin = true;
                }
                else {
                    req.isAdmin = false;
                }
            }
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
    if (!req.user && !req.isAdmin) {
        res.status(401).json({
            success: false,
            message: 'Требуется авторизация',
        });
        return;
    }
    next();
};
exports.requireAuth = requireAuth;
