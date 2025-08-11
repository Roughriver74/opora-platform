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
exports.PasswordHashService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const SALT_ROUNDS = 10;
/**
 * Утилиты для работы с хешированием паролей
 */
class PasswordHashService {
    /**
     * Хеширование пароля
     */
    static hashPassword(password) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const salt = yield bcrypt_1.default.genSalt(SALT_ROUNDS);
                return yield bcrypt_1.default.hash(password, salt);
            }
            catch (error) {
                console.error('Ошибка хеширования пароля:', error);
                throw new Error('Не удалось хешировать пароль');
            }
        });
    }
    /**
     * Сравнение пароля с хешем
     */
    static comparePassword(password, hash) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield bcrypt_1.default.compare(password, hash);
            }
            catch (error) {
                console.error('Ошибка сравнения пароля:', error);
                return false;
            }
        });
    }
    /**
     * Валидация силы пароля
     */
    static validatePassword(password) {
        if (!password) {
            return { isValid: false, message: 'Пароль не может быть пустым' };
        }
        if (password.length < 6) {
            return { isValid: false, message: 'Пароль должен содержать минимум 6 символов' };
        }
        if (password.length > 128) {
            return { isValid: false, message: 'Пароль слишком длинный (максимум 128 символов)' };
        }
        // Проверка на наличие хотя бы одной буквы и одной цифры
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /\d/.test(password);
        if (!hasLetter || !hasNumber) {
            return {
                isValid: false,
                message: 'Пароль должен содержать хотя бы одну букву и одну цифру'
            };
        }
        return { isValid: true };
    }
    /**
     * Генерация случайного пароля
     */
    static generateRandomPassword(length = 12) {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return password;
    }
}
exports.PasswordHashService = PasswordHashService;
