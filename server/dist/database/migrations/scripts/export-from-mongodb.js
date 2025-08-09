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
const mongoose_1 = __importDefault(require("mongoose"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const dotenv = __importStar(require("dotenv"));
// Импорт MongoDB моделей
const User_1 = __importDefault(require("../../../models/User"));
const Form_1 = __importDefault(require("../../../models/Form"));
const FormField_1 = __importDefault(require("../../../models/FormField"));
const Submission_1 = __importDefault(require("../../../models/Submission"));
dotenv.config();
class MongoDBExporter {
    constructor() {
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        this.exportDir = path.join(__dirname, `../data/export-${timestamp}`);
        // Создание директории для экспорта
        if (!fs.existsSync(this.exportDir)) {
            fs.mkdirSync(this.exportDir, { recursive: true });
        }
    }
    async connect() {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/beton-crm';
        try {
            await mongoose_1.default.connect(mongoUri);
            console.log('✅ Подключено к MongoDB');
        }
        catch (error) {
            console.error('❌ Ошибка подключения к MongoDB:', error);
            throw error;
        }
    }
    async exportUsers() {
        console.log('📤 Экспорт пользователей...');
        const users = await User_1.default.find({}).lean();
        console.log(`   Найдено ${users.length} пользователей`);
        // Преобразование данных
        const exportedUsers = users.map(user => ({
            _id: user._id.toString(),
            email: user.email,
            password: user.password, // Уже захеширован
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            bitrix_id: user.bitrix_id,
            bitrixUserId: user.bitrixUserId,
            status: user.status || 'active',
            role: user.role || 'user',
            isActive: user.isActive !== false,
            settings: user.settings || { onlyMyCompanies: false },
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        }));
        this.saveToFile('users.json', exportedUsers);
        return exportedUsers;
    }
    async exportForms() {
        console.log('📤 Экспорт форм...');
        const forms = await Form_1.default.find({}).populate('fields').lean();
        console.log(`   Найдено ${forms.length} форм`);
        const exportedForms = forms.map(form => ({
            _id: form._id.toString(),
            name: form.name,
            title: form.title,
            description: form.description,
            isActive: form.isActive !== false,
            bitrixDealCategory: form.bitrixDealCategory,
            successMessage: form.successMessage || 'Спасибо! Ваша заявка успешно отправлена.',
            fields: form.fields?.map((f) => f._id.toString()) || [],
            createdAt: form.createdAt,
            updatedAt: form.updatedAt,
        }));
        this.saveToFile('forms.json', exportedForms);
        return exportedForms;
    }
    async exportFormFields() {
        console.log('📤 Экспорт полей форм...');
        const fields = await FormField_1.default.find({}).lean();
        console.log(`   Найдено ${fields.length} полей`);
        const exportedFields = fields.map(field => ({
            _id: field._id.toString(),
            formId: field.formId,
            sectionId: field.sectionId,
            name: field.name,
            label: field.label,
            type: field.type,
            required: field.required || false,
            placeholder: field.placeholder,
            bitrixFieldId: field.bitrixFieldId,
            bitrixFieldType: field.bitrixFieldType,
            bitrixEntity: field.bitrixEntity,
            options: field.options,
            dynamicSource: field.dynamicSource,
            linkedFields: field.linkedFields,
            order: field.order || 0,
            createdAt: field.createdAt,
            updatedAt: field.updatedAt,
        }));
        this.saveToFile('formFields.json', exportedFields);
        return exportedFields;
    }
    async exportSubmissions() {
        console.log('📤 Экспорт заявок...');
        const submissions = await Submission_1.default.find({}).lean();
        console.log(`   Найдено ${submissions.length} заявок`);
        const exportedSubmissions = submissions.map(sub => ({
            _id: sub._id.toString(),
            submissionNumber: sub.submissionNumber,
            formId: sub.formId?.toString(),
            userId: sub.userId?.toString(),
            assignedTo: sub.assignedTo?.toString(),
            title: sub.title,
            status: sub.status || 'NEW',
            priority: sub.priority || 'medium',
            bitrixDealId: sub.bitrixDealId,
            bitrixCategoryId: sub.bitrixCategoryId,
            bitrixSyncStatus: sub.bitrixSyncStatus || 'pending',
            bitrixSyncError: sub.bitrixSyncError,
            notes: sub.notes,
            tags: sub.tags || [],
            // Денормализованные данные
            formName: sub.formName,
            formTitle: sub.formTitle,
            userEmail: sub.userEmail,
            userName: sub.userName,
            assignedToName: sub.assignedToName,
            // Предвычисленные поля
            dayOfWeek: sub.dayOfWeek,
            monthOfYear: sub.monthOfYear,
            yearCreated: sub.yearCreated,
            processingTimeMinutes: sub.processingTimeMinutes,
            createdAt: sub.createdAt,
            updatedAt: sub.updatedAt,
        }));
        this.saveToFile('submissions.json', exportedSubmissions);
        return exportedSubmissions;
    }
    saveToFile(filename, data) {
        const filePath = path.join(this.exportDir, filename);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`   ✅ Сохранено в ${filename}`);
    }
    async exportAll() {
        console.log('🚀 Начало экспорта данных из MongoDB...');
        console.log(`📁 Директория экспорта: ${this.exportDir}`);
        try {
            await this.connect();
            const exportData = {
                users: await this.exportUsers(),
                forms: await this.exportForms(),
                formFields: await this.exportFormFields(),
                submissions: await this.exportSubmissions(),
                exportDate: new Date(),
                version: '1.0.0',
            };
            // Сохранение сводной информации
            const summary = {
                exportDate: exportData.exportDate,
                version: exportData.version,
                statistics: {
                    users: exportData.users.length,
                    forms: exportData.forms.length,
                    formFields: exportData.formFields.length,
                    submissions: exportData.submissions.length,
                },
                exportDir: this.exportDir,
            };
            this.saveToFile('export-summary.json', summary);
            console.log('\n📊 Статистика экспорта:');
            console.log(`   Пользователи: ${summary.statistics.users}`);
            console.log(`   Формы: ${summary.statistics.forms}`);
            console.log(`   Поля форм: ${summary.statistics.formFields}`);
            console.log(`   Заявки: ${summary.statistics.submissions}`);
            console.log('\n✅ Экспорт завершен успешно!');
        }
        catch (error) {
            console.error('❌ Ошибка экспорта:', error);
            throw error;
        }
        finally {
            await mongoose_1.default.disconnect();
            console.log('🔌 Отключено от MongoDB');
        }
    }
    async validateExport() {
        console.log('\n🔍 Валидация экспортированных данных...');
        const files = ['users.json', 'forms.json', 'formFields.json', 'submissions.json'];
        let isValid = true;
        for (const file of files) {
            const filePath = path.join(this.exportDir, file);
            if (!fs.existsSync(filePath)) {
                console.error(`   ❌ Файл ${file} не найден`);
                isValid = false;
                continue;
            }
            try {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                console.log(`   ✅ ${file}: ${data.length} записей`);
                // Базовая валидация структуры
                if (data.length > 0) {
                    const sample = data[0];
                    if (!sample._id || !sample.createdAt) {
                        console.error(`   ⚠️  ${file}: неполная структура данных`);
                        isValid = false;
                    }
                }
            }
            catch (error) {
                console.error(`   ❌ Ошибка чтения ${file}:`, error);
                isValid = false;
            }
        }
        if (isValid) {
            console.log('\n✅ Валидация пройдена успешно');
        }
        else {
            console.log('\n❌ Валидация завершена с ошибками');
        }
    }
}
// Запуск экспорта
if (require.main === module) {
    const exporter = new MongoDBExporter();
    exporter.exportAll()
        .then(() => exporter.validateExport())
        .catch(error => {
        console.error('Критическая ошибка:', error);
        process.exit(1);
    });
}
exports.default = MongoDBExporter;
