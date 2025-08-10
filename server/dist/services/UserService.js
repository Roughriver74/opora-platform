"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserService = exports.UserService = void 0;
const BaseService_1 = require("./base/BaseService");
const User_entity_1 = require("../database/entities/User.entity");
const repositories_1 = require("../database/repositories");
const jwt = __importStar(require("jsonwebtoken"));
const bcrypt = __importStar(require("bcrypt"));
class UserService extends BaseService_1.BaseService {
    constructor() {
        super((0, repositories_1.getUserRepository)());
    }
    async createUser(data) {
        // Валидация уникальности email
        const emailExists = await this.repository.findByEmail(data.email);
        if (emailExists) {
            this.throwDuplicateError('Email', data.email);
        }
        // Создание пользователя
        const user = await this.repository.create({
            ...data,
            email: data.email.toLowerCase(),
            role: data.role || User_entity_1.UserRole.USER,
            status: User_entity_1.UserStatus.ACTIVE,
            isActive: true,
        });
        return user;
    }
    async login(credentials) {
        const user = await this.repository.findByEmail(credentials.email);
        if (!user || !user.isActive) {
            return null;
        }
        // Используем bcrypt напрямую
        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordValid) {
            return null;
        }
        // Обновление последнего входа
        await this.repository.updateLastLogin(user.id);
        // Генерация JWT токена
        const token = this.generateToken(user);
        return {
            token,
            user: user.toSafeObject(),
        };
    }
    async updateUser(id, data) {
        const user = await this.repository.findById(id);
        if (!user) {
            this.throwNotFound('Пользователь', id);
        }
        return this.repository.update(id, data);
    }
    async updateSettings(userId, settings) {
        return this.repository.updateSettings(userId, settings);
    }
    async changePassword(userId, oldPassword, newPassword) {
        const user = await this.repository.findById(userId);
        if (!user) {
            this.throwNotFound('Пользователь', userId);
        }
        const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordValid) {
            this.throwValidationError('Неверный текущий пароль');
        }
        return this.repository.changePassword(userId, newPassword);
    }
    async deactivateUser(userId) {
        return this.repository.deactivateUser(userId);
    }
    async activateUser(userId) {
        return this.repository.activateUser(userId);
    }
    async findByEmail(email) {
        return this.repository.findByEmail(email);
    }
    async findByBitrixUserId(bitrixUserId) {
        return this.repository.findByBitrixUserId(bitrixUserId);
    }
    async findActiveUsers() {
        return this.repository.findActiveUsers();
    }
    async findAdmins() {
        return this.repository.findAdmins();
    }
    async findByRole(role) {
        return this.repository.findByRole(role);
    }
    async searchUsers(query) {
        return this.repository.searchUsers(query);
    }
    async getAssignableUsers() {
        return this.repository.getAssignableUsers();
    }
    async getUserStatistics(userId) {
        return this.repository.getUserStatistics(userId);
    }
    async createOrUpdateFromBitrix(bitrixData) {
        const existingUser = await this.repository.findByBitrixUserId(bitrixData.ID);
        if (existingUser) {
            // Обновление существующего пользователя
            return this.repository.update(existingUser.id, {
                firstName: bitrixData.NAME || existingUser.firstName,
                lastName: bitrixData.LAST_NAME || existingUser.lastName,
                email: bitrixData.EMAIL || existingUser.email,
                phone: bitrixData.PERSONAL_MOBILE || existingUser.phone,
            });
        }
        // Создание нового пользователя
        return this.repository.create({
            email: bitrixData.EMAIL.toLowerCase(),
            password: this.generateRandomPassword(),
            firstName: bitrixData.NAME,
            lastName: bitrixData.LAST_NAME,
            phone: bitrixData.PERSONAL_MOBILE,
            bitrixUserId: bitrixData.ID,
            status: User_entity_1.UserStatus.ACTIVE,
            isActive: true,
            role: User_entity_1.UserRole.USER,
        });
    }
    generateToken(user) {
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role,
        };
        const secret = process.env.JWT_SECRET || 'secret';
        const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
        return jwt.sign(payload, secret, { expiresIn });
    }
    generateRandomPassword() {
        return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    }
    async verifyToken(token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
            return this.repository.findById(decoded.id);
        }
        catch (error) {
            return null;
        }
    }
    async findWithPaginationAndFilters(page = 1, limit = 20, filters = {}) {
        return this.repository.findWithPaginationAndFilters(page, limit, filters);
    }
    // Публичный доступ к repository для прямых операций
    get userRepository() {
        return this.repository;
    }
}
exports.UserService = UserService;
// Синглтон для сервиса
let userService = null;
const getUserService = () => {
    if (!userService) {
        userService = new UserService();
    }
    return userService;
};
exports.getUserService = getUserService;
