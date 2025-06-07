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
exports.logout = exports.verifyToken = exports.adminLogin = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const AdminToken_1 = __importDefault(require("../models/AdminToken"));
// Время жизни токена - 7 дней
const TOKEN_EXPIRY = '7d';
/**
 * Аутентификация администратора
 */
const adminLogin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { password } = req.body;
        if (!password) {
            res.status(400).json({
                success: false,
                message: 'Пароль обязателен'
            });
            return;
        }
        // Получаем пароль из переменных окружения
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (!adminPassword) {
            console.error('ADMIN_PASSWORD не установлен в переменных окружения');
            res.status(500).json({
                success: false,
                message: 'Внутренняя ошибка сервера'
            });
            return;
        }
        // Проверяем пароль
        if (password !== adminPassword) {
            res.status(401).json({
                success: false,
                message: 'Неверный пароль'
            });
            return;
        }
        // Создаем JWT токен
        const secret = process.env.JWT_SECRET || 'default-jwt-secret-key-change-in-production';
        const token = jsonwebtoken_1.default.sign({}, secret, { expiresIn: TOKEN_EXPIRY });
        // Сохраняем токен в базе данных для возможности отзыва
        yield AdminToken_1.default.create({ token });
        res.json({
            success: true,
            token,
            expiresIn: TOKEN_EXPIRY
        });
    }
    catch (error) {
        console.error('Ошибка аутентификации:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера'
        });
    }
});
exports.adminLogin = adminLogin;
/**
 * Проверка валидности токена
 */
const verifyToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
        if (!token) {
            res.status(401).json({
                success: false,
                message: 'Токен отсутствует'
            });
            return;
        }
        // Проверяем токен в базе данных
        const tokenDoc = yield AdminToken_1.default.findOne({ token });
        if (!tokenDoc) {
            res.status(401).json({
                success: false,
                message: 'Токен недействителен или отозван'
            });
            return;
        }
        const secret = process.env.JWT_SECRET || 'default-jwt-secret-key-change-in-production';
        jsonwebtoken_1.default.verify(token, secret, (err) => {
            if (err) {
                res.status(401).json({
                    success: false,
                    message: 'Токен недействителен'
                });
                return;
            }
            res.json({
                success: true,
                message: 'Токен действителен'
            });
        });
    }
    catch (error) {
        console.error('Ошибка проверки токена:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера'
        });
    }
});
exports.verifyToken = verifyToken;
/**
 * Logout - отзыв токена
 */
const logout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
        if (token) {
            // Удаляем токен из базы данных
            yield AdminToken_1.default.deleteOne({ token });
        }
        res.json({
            success: true,
            message: 'Выход выполнен успешно'
        });
    }
    catch (error) {
        console.error('Ошибка при выходе:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера'
        });
    }
});
exports.logout = logout;
