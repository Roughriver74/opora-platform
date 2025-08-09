"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuthMiddleware = void 0;
const jwtService_1 = require("../services/jwtService");
// Middleware для опциональной авторизации
// Если токен есть - проверяет и устанавливает req.user
// Если токена нет - просто пропускает дальше
const optionalAuthMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // Нет токена - продолжаем как анонимный пользователь
            console.log('Нет токена авторизации, продолжаем как анонимный пользователь');
            return next();
        }
        const token = authHeader.substring(7); // Убираем 'Bearer '
        if (!token) {
            // Пустой токен - продолжаем как анонимный пользователь
            console.log('Пустой токен, продолжаем как анонимный пользователь');
            return next();
        }
        try {
            // Пытаемся верифицировать токен через jwtService
            const tokenData = await jwtService_1.jwtService.verifyToken(token);
            if (!tokenData || tokenData.type !== 'access') {
                console.log('Неверный или недействительный токен, продолжаем как анонимный пользователь');
                return next();
            }
            // Устанавливаем пользователя
            req.user = {
                id: tokenData.id,
                role: tokenData.role,
                isAdmin: tokenData.role === 'admin',
                isUser: tokenData.role === 'user',
                tokenType: tokenData.type
            };
            console.log('Пользователь авторизован:', req.user);
            next();
        }
        catch (jwtError) {
            // Ошибка декодирования токена - продолжаем как анонимный пользователь
            console.log('Ошибка декодирования токена, продолжаем как анонимный пользователь:', jwtError.message);
            next();
        }
    }
    catch (error) {
        // Любая другая ошибка - продолжаем как анонимный пользователь
        console.log('Ошибка в optionalAuthMiddleware, продолжаем как анонимный пользователь:', error.message);
        next();
    }
};
exports.optionalAuthMiddleware = optionalAuthMiddleware;
