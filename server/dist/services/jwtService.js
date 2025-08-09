"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtService = exports.JWTService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const AdminToken_1 = __importDefault(require("../models/AdminToken"));
// Время жизни токенов
const ACCESS_TOKEN_EXPIRY = '4h'; // Увеличено время для access токена до 4 часов
const REFRESH_TOKEN_EXPIRY = '7d'; // Длинное время для refresh токена
/**
 * JWT сервис для создания и верификации токенов
 */
class JWTService {
    constructor() {
        this.secret =
            process.env.JWT_SECRET || 'default-jwt-secret-key-change-in-production';
    }
    /**
     * Создание пары access и refresh токенов
     */
    async generateTokenPair(payload) {
        // Создаем access токен
        const accessToken = jsonwebtoken_1.default.sign({ ...payload, type: 'access' }, this.secret, {
            expiresIn: ACCESS_TOKEN_EXPIRY,
        });
        // Создаем refresh токен
        const refreshToken = jsonwebtoken_1.default.sign({ ...payload, type: 'refresh' }, this.secret, { expiresIn: REFRESH_TOKEN_EXPIRY });
        // Сохраняем refresh токен в базе данных
        await AdminToken_1.default.create({
            token: refreshToken,
            type: 'refresh',
        });
        return {
            accessToken,
            refreshToken,
            expiresIn: ACCESS_TOKEN_EXPIRY,
        };
    }
    /**
     * Верификация токена
     */
    async verifyToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.secret);
            // Для refresh токенов проверяем наличие в базе данных
            if (decoded.type === 'refresh') {
                const tokenDoc = await AdminToken_1.default.findOne({ token });
                if (!tokenDoc) {
                    return null;
                }
            }
            return decoded;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Обновление access токена с помощью refresh токена
     */
    async refreshAccessToken(refreshToken) {
        try {
            const decoded = await this.verifyToken(refreshToken);
            if (!decoded || decoded.type !== 'refresh') {
                return null;
            }
            // Создаем новый access токен
            const newAccessToken = jsonwebtoken_1.default.sign({
                id: decoded.id,
                role: decoded.role,
                type: 'access',
            }, this.secret, { expiresIn: ACCESS_TOKEN_EXPIRY });
            return newAccessToken;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Отзыв токена (logout)
     */
    async revokeToken(token) {
        try {
            await AdminToken_1.default.deleteOne({ token });
            return true;
        }
        catch (error) {
            console.error('Ошибка при отзыве токена:', error);
            return false;
        }
    }
    /**
     * Отзыв всех токенов пользователя
     */
    async revokeAllUserTokens(userId) {
        try {
            // Для текущей простой системы удаляем все токены
            // В будущем можно добавить фильтрацию по userId
            await AdminToken_1.default.deleteMany({});
            return true;
        }
        catch (error) {
            console.error('Ошибка при отзыве всех токенов:', error);
            return false;
        }
    }
}
exports.JWTService = JWTService;
// Экспортируем экземпляр сервиса
exports.jwtService = new JWTService();
