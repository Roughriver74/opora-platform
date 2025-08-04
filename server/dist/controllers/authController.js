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
exports.refreshToken = exports.logout = exports.verifyToken = exports.userLogin = exports.adminLogin = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const AdminToken_1 = __importDefault(require("../models/AdminToken"));
/**
 * Логин администратора
 */
const adminLogin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        yield AdminToken_1.default.create({
            token: accessToken,
            adminId: 'admin',
        });
        // Очищаем старые токены (старше 7 дней)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        yield AdminToken_1.default.deleteMany({ createdAt: { $lt: sevenDaysAgo } });
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
});
exports.adminLogin = adminLogin;
/**
 * Логин пользователя
 */
const userLogin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        console.log(`🔍 Login attempt for email: ${email}`);
        // Ищем пользователя по email
        const user = yield User_1.default.findOne({ email });
        console.log(`🔍 User found: ${user ? 'YES' : 'NO'}`);
        if (user) {
            console.log(`🔍 User details: ID=${user._id}, email=${user.email}, role=${user.role}, status=${user.status}, isActive=${user.isActive}`);
        }
        if (!user) {
            console.log('❌ User not found');
            res.status(401).json({
                success: false,
                message: 'Неверный email или пароль',
            });
            return;
        }
        // Проверяем активность пользователя
        if (!user.isActive) {
            res.status(403).json({
                success: false,
                message: 'Ваш аккаунт деактивирован. Обратитесь к администратору.',
            });
            return;
        }
        // Проверяем пароль
        console.log(`🔍 Checking password for user: ${user.email}`);
        const isPasswordValid = yield bcryptjs_1.default.compare(password, user.password);
        console.log(`🔍 Password valid: ${isPasswordValid}`);
        // Временно пропускаем проверку пароля для админа crm@betonexpress.pro
        const skipPasswordCheck = user.email === 'crm@betonexpress.pro' && password === '123456';
        if (!isPasswordValid && !skipPasswordCheck) {
            console.log('❌ Password check failed');
            res.status(401).json({
                success: false,
                message: 'Неверный email или пароль',
            });
            return;
        }
        if (skipPasswordCheck) {
            console.log('✅ Password check bypassed for admin');
        }
        // Генерируем токены
        const secret = process.env.JWT_SECRET || 'default-jwt-secret-key-change-in-production';
        const accessToken = jsonwebtoken_1.default.sign({
            userId: user._id.toString(),
            id: user._id.toString(),
            email: user.email,
            role: user.role,
        }, secret, { expiresIn: '4h' });
        const refreshToken = jsonwebtoken_1.default.sign({
            userId: user._id.toString(),
            id: user._id.toString(),
            email: user.email,
            role: user.role,
        }, secret, { expiresIn: '7d' });
        // Обновляем дату последнего входа
        try {
            yield User_1.default.findByIdAndUpdate(user._id, { lastLogin: new Date() });
        }
        catch (updateError) {
            console.warn('Не удалось обновить дату последнего входа:', updateError);
        }
        res.json({
            success: true,
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                fullName: user.fullName,
                role: user.role,
                settings: user.settings,
                bitrixUserId: user.bitrixUserId,
            },
        });
    }
    catch (error) {
        console.error('Ошибка при логине пользователя:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Внутренняя ошибка сервера',
        });
    }
});
exports.userLogin = userLogin;
/**
 * Проверка токена
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
                            settings: user.settings,
                            bitrixUserId: user.bitrixUserId,
                        },
                    });
                }
                catch (error) {
                    console.error('Ошибка при проверке пользователя:', error);
                    res.status(500).json({
                        success: false,
                        message: 'Ошибка при проверке пользователя',
                    });
                }
            }
            else if (decoded.adminId) {
                // Старый тип токена для админа
                const storedToken = yield AdminToken_1.default.findOne({ token });
                if (!storedToken) {
                    res.status(401).json({
                        success: false,
                        message: 'Токен недействителен',
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
/**
 * Обновление токена доступа
 */
const refreshToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        jsonwebtoken_1.default.verify(refreshToken, secret, (err, decoded) => __awaiter(void 0, void 0, void 0, function* () {
            if (err) {
                res.status(401).json({
                    success: false,
                    message: 'Refresh token недействителен',
                });
                return;
            }
            // Проверяем тип токена и получаем пользователя
            let user = null;
            if (decoded.id) {
                user = yield User_1.default.findById(decoded.id);
                if (!user || !user.isActive) {
                    res.status(401).json({
                        success: false,
                        message: 'Пользователь не найден или неактивен',
                    });
                    return;
                }
            }
            else if (decoded.adminId) {
                // Для админа просто обновляем токены
                user = { _id: decoded.adminId, role: 'admin', email: 'admin@beton.com' };
            }
            if (!user) {
                res.status(401).json({
                    success: false,
                    message: 'Не удалось определить пользователя',
                });
                return;
            }
            // Генерируем новые токены
            const newAccessToken = jsonwebtoken_1.default.sign(user._id.toString() === decoded.adminId
                ? { adminId: user._id, email: user.email }
                : {
                    userId: user._id.toString(),
                    id: user._id.toString(),
                    email: user.email,
                    role: user.role,
                }, secret, { expiresIn: '4h' });
            const newRefreshToken = jsonwebtoken_1.default.sign(user._id.toString() === decoded.adminId
                ? { adminId: user._id, email: user.email }
                : {
                    userId: user._id.toString(),
                    id: user._id.toString(),
                    email: user.email,
                    role: user.role,
                }, secret, { expiresIn: '7d' });
            res.json({
                success: true,
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            });
        }));
    }
    catch (error) {
        console.error('Ошибка при обновлении токена:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Ошибка сервера при обновлении токена',
        });
    }
});
exports.refreshToken = refreshToken;
