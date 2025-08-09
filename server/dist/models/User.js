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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const UserSchema = new mongoose_1.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    firstName: {
        type: String,
        trim: true,
    },
    lastName: {
        type: String,
        trim: true,
    },
    phone: {
        type: String,
        trim: true,
    },
    bitrix_id: {
        type: String,
        trim: true,
    },
    bitrixUserId: {
        type: String,
        trim: true,
    },
    lastLogin: {
        type: Date,
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    settings: {
        onlyMyCompanies: {
            type: Boolean,
            default: false,
        },
    },
}, {
    timestamps: true,
});
// Индексы для оптимизации поиска
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
// Хеширование пароля перед сохранением
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password'))
        return next();
    try {
        const salt = await bcrypt_1.default.genSalt(10);
        this.password = await bcrypt_1.default.hash(this.password.toString(), salt);
        next();
    }
    catch (error) {
        next(error);
    }
});
// Метод для сравнения паролей
UserSchema.methods.comparePassword = async function (password) {
    return bcrypt_1.default.compare(password, this.password);
};
// Метод для получения безопасного объекта пользователя (без пароля)
UserSchema.methods.toSafeObject = function () {
    const userObject = this.toObject({ virtuals: true });
    delete userObject.password;
    delete userObject.__v;
    return userObject;
};
// Виртуальное поле для полного имени
UserSchema.virtual('fullName').get(function () {
    if (this.firstName && this.lastName) {
        return `${this.firstName} ${this.lastName}`;
    }
    return this.firstName || this.lastName || this.email;
});
// Настройка JSON сериализации
UserSchema.set('toJSON', {
    virtuals: true,
    transform: function (doc, ret) {
        delete ret.password; // Убираем пароль из JSON ответа
        return ret;
    },
});
exports.default = mongoose_1.default.model('User', UserSchema);
