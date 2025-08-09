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
exports.addSubmissionChange = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const SubmissionHistorySchema = new mongoose_1.Schema({
    submissionId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Submission',
        required: true
    },
    changedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Делаем необязательным для системных админов
    },
    changeType: {
        type: String,
        enum: ['status_change', 'priority_change', 'assignment', 'data_update', 'note_added', 'tag_added', 'tag_removed'],
        required: true
    },
    oldValue: {
        type: mongoose_1.Schema.Types.Mixed
    },
    newValue: {
        type: mongoose_1.Schema.Types.Mixed
    },
    fieldName: {
        type: String
    },
    description: {
        type: String,
        required: true
    },
    comment: {
        type: String
    },
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    }
}, {
    timestamps: { createdAt: 'changedAt', updatedAt: false }
});
// Индексы
SubmissionHistorySchema.index({ submissionId: 1, changedAt: -1 });
SubmissionHistorySchema.index({ changedBy: 1 });
SubmissionHistorySchema.index({ changeType: 1 });
// Статический метод для создания записи истории
const addSubmissionChange = async (submissionId, changedBy, changeType, description, oldValue, newValue, fieldName, comment, req) => {
    // Обрабатываем случай с админской авторизацией
    let changedByObjectId;
    if (changedBy === 'super_admin' || changedBy === 'admin') {
        // Для системных админов создаем специальный ObjectId или используем null
        changedByObjectId = null; // Можно также использовать специальный ObjectId
    }
    else if (mongoose_1.default.Types.ObjectId.isValid(changedBy)) {
        changedByObjectId = changedBy;
    }
    else {
        // Если не валидный ObjectId и не системный админ, пропускаем создание записи
        console.warn(`Невалидный changedBy: ${changedBy}, пропускаем создание записи истории`);
        return null;
    }
    const historyRecord = new (mongoose_1.default.model('SubmissionHistory'))({
        submissionId,
        changedBy: changedByObjectId,
        changeType,
        description,
        oldValue,
        newValue,
        fieldName,
        comment,
        ipAddress: req?.ip,
        userAgent: req?.get('User-Agent')
    });
    return await historyRecord.save();
};
exports.addSubmissionChange = addSubmissionChange;
exports.default = mongoose_1.default.model('SubmissionHistory', SubmissionHistorySchema);
