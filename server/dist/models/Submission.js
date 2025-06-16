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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const SubmissionSchema = new mongoose_1.Schema({
    submissionNumber: {
        type: String,
        unique: true,
        required: false, // Убираем required, так как генерируется в pre-save hook
    },
    formId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Form',
        required: true,
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: false, // Может быть анонимная заявка
    },
    title: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        default: 'NEW',
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
    },
    bitrixDealId: {
        type: String,
        required: false, // Может быть пустым при создании, заполняется после создания сделки в Битрикс24
    },
    bitrixCategoryId: {
        type: String,
        sparse: true,
    },
    bitrixSyncStatus: {
        type: String,
        enum: ['pending', 'synced', 'failed'],
        default: 'pending',
    },
    bitrixSyncError: {
        type: String,
    },
    assignedTo: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    notes: {
        type: String,
    },
    tags: [
        {
            type: String,
        },
    ],
}, {
    timestamps: true, // автоматически добавляет createdAt и updatedAt
});
// Создание уникального номера заявки
SubmissionSchema.pre('save', function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (this.isNew && !this.submissionNumber) {
                console.log('Генерация номера заявки...');
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(today.getDate()).padStart(2, '0');
                console.log('Дата для номера заявки:', { year, month, day });
                // Более простая и надежная генерация номера
                const randomSuffix = Math.floor(Math.random() * 9999)
                    .toString()
                    .padStart(4, '0');
                this.submissionNumber = `${year}${month}${day}${randomSuffix}`;
                console.log('Сгенерированный номер заявки:', this.submissionNumber);
            }
            next();
        }
        catch (error) {
            console.error('Ошибка в pre-save hook для submissionNumber:', error);
            // Генерируем fallback номер если что-то пошло не так
            if (this.isNew && !this.submissionNumber) {
                this.submissionNumber = `SUB${Date.now()}`;
                console.log('Использован fallback номер:', this.submissionNumber);
            }
            next();
        }
    });
});
// Индексы для оптимизации
// Убираем дублирующиеся индексы - submissionNumber уже имеет unique: true
SubmissionSchema.index({ formId: 1 });
SubmissionSchema.index({ userId: 1 });
SubmissionSchema.index({ status: 1 });
SubmissionSchema.index({ createdAt: -1 });
SubmissionSchema.index({ assignedTo: 1 });
// Виртуальные поля
SubmissionSchema.virtual('submittedAt').get(function () {
    return this.createdAt;
});
exports.default = mongoose_1.default.model('Submission', SubmissionSchema);
