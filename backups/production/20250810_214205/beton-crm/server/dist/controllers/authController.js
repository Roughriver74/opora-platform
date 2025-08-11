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
exports.logout = exports.verifyToken = exports.userLogin = exports.adminLogin = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const AdminToken_1 = __importDefault(require("../models/AdminToken"));
const User_1 = __importDefault(require("../models/User"));
// Время жизни токена - 4 часа
const TOKEN_EXPIRY = '4h';
/**
 * Аутентификация администратора
 */
const adminLogin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { password } = req.body;
        if (!password) {
            res.status(400).json({
                success: false,
                message: 'Пароль обязателен',
            });
            return;
        }
        // Получаем пароль из переменных окружения
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (!adminPassword) {
            console.error('ADMIN_PASSWORD не установлен в переменных окружения');
            res.status(500).json({
                success: false,
                message: 'Внутренняя ошибка сервера',
            });
            return;
        }
        // Проверяем пароль
        if (password !== adminPassword) {
            res.status(401).json({
                success: false,
                message: 'Неверный пароль',
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
            expiresIn: TOKEN_EXPIRY,
        });
    }
    catch (error) {
        console.error('Ошибка аутентификации:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера',
        });
    }
});
exports.adminLogin = adminLogin;
/**
 * Аутентификация пользователя по email и паролю
 */
const userLogin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        console.log('=== НАЧАЛО ПРОЦЕССА АВТОРИЗАЦИИ ===');
        console.log('Email:', email);
        console.log('Password length:', password ? password.length : 0);
        if (!email || !password) {
            console.log('❌ Отсутствует email или пароль');
            res.status(400).json({
                success: false,
                message: 'Email и пароль обязательны',
            });
            return;
        }
        // Ищем пользователя по email
        console.log('🔍 Поиск пользователя по email:', email.toLowerCase());
        const user = yield User_1.default.findOne({ email: email.toLowerCase() });
        if (!user) {
            console.log('❌ Пользователь не найден в базе данных');
            res.status(401).json({
                success: false,
                message: 'Неверный email или пароль',
            });
            return;
        }
        console.log('✅ Пользователь найден:', {
            id: user._id,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            status: user.status,
        });
        // Проверяем пароль
        console.log('🔐 Проверка пароля...');
        const isPasswordValid = yield user.comparePassword(password);
        if (!isPasswordValid) {
            console.log('❌ Неверный пароль');
            res.status(401).json({
                success: false,
                message: 'Неверный email или пароль',
            });
            return;
        }
        console.log('✅ Пароль правильный');
        // Проверяем, активен ли пользователь
        if (!user.isActive) {
            console.log('❌ Пользователь неактивен:', user.isActive);
            res.status(401).json({
                success: false,
                message: 'Аккаунт деактивирован',
            });
            return;
        }
        if (user.status === 'inactive') {
            console.log('❌ Статус пользователя inactive:', user.status);
            res.status(401).json({
                success: false,
                message: 'Аккаунт деактивирован',
            });
            return;
        }
        console.log('✅ Пользователь активен');
        // Создаем JWT токены
        const secret = process.env.JWT_SECRET || 'default-jwt-secret-key-change-in-production';
        const accessToken = jsonwebtoken_1.default.sign({
            userId: user._id,
            id: user._id, // Для обратной совместимости
            role: user.role,
            type: 'access',
        }, secret, { expiresIn: '4h' });
        const refreshToken = jsonwebtoken_1.default.sign({
            userId: user._id,
            id: user._id, // Для обратной совместимости
            role: user.role,
            type: 'refresh',
        }, secret, { expiresIn: '7d' });
        // Возвращаем токены и информацию о пользователе
        console.log('🎉 АВТОРИЗАЦИЯ УСПЕШНА!');
        console.log('Выданные токены:', {
            accessTokenLength: accessToken.length,
            refreshTokenLength: refreshToken.length,
            userRole: user.role,
        });
        console.log('=== КОНЕЦ ПРОЦЕССА АВТОРИЗАЦИИ ===');
        res.json({
            success: true,
            accessToken,
            refreshToken,
            expiresIn: '4h',
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                fullName: user.fullName,
                role: user.role,
            },
        });
    }
    catch (error) {
        console.error('❌ КРИТИЧЕСКАЯ ОШИБКА АВТОРИЗАЦИИ:', error);
        console.log('=== КОНЕЦ ПРОЦЕССА АВТОРИЗАЦИИ (С ОШИБКОЙ) ===');
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера',
        });
    }
});
exports.userLogin = userLogin;
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
                message: 'Токен отсутствует',
            });
            return;
        }
        const secret = process.env.JWT_SECRET || 'default-jwt-secret-key-change-in-production';
        jsonwebtoken_1.default.verify(token, secret, (err, decoded) => __awaiter(void 0, void 0, void 0, function* () {
            if (err) {
                res.status(401).json({
                    success: false,
                    message: 'Токен недействителен',
                });
                return;
            }
            // Проверяем тип токена
            if (decoded.id) {
                // Новый тип токена с пользователем
                try {
                    const user = yield User_1.default.findById(decoded.id);
                    if (!user || !user.isActive) {
                        res.status(401).json({
                            success: false,
                            message: 'Пользователь не найден или неактивен',
                        });
                        return;
                    }
                    res.json({
                        success: true,
                        message: 'Токен действителен',
                        user: {
                            id: user._id,
                            email: user.email,
                            firstName: user.firstName,
                            lastName: user.lastName,
                            fullName: user.fullName,
                            role: user.role,
                        },
                    });
                }
                catch (userError) {
                    res.status(401).json({
                        success: false,
                        message: 'Ошибка проверки пользователя',
                    });
                }
            }
            else {
                // Старый тип токена (админ)
                const tokenDoc = yield AdminToken_1.default.findOne({ token });
                if (!tokenDoc) {
                    res.status(401).json({
                        success: false,
                        message: 'Токен недействителен или отозван',
                    });
                    return;
                }
                res.json({
                    success: true,
                    message: 'Токен действителен',
                    user: {
                        role: 'admin',
                    },
                });
            }
        }));
    }
    catch (error) {
        console.error('Ошибка проверки токена:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера',
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
});
exports.logout = logout;
