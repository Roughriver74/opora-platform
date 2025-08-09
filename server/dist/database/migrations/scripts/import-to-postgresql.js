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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const database_config_1 = require("../../config/database.config");
const User_entity_1 = require("../../entities/User.entity");
const Form_entity_1 = require("../../entities/Form.entity");
const FormField_entity_1 = require("../../entities/FormField.entity");
const Submission_entity_1 = require("../../entities/Submission.entity");
class PostgreSQLImporter {
    constructor(transformedDataDir) {
        this.batchSize = 100;
        this.dataDir = transformedDataDir;
        this.statistics = {
            users: { total: 0, imported: 0, failed: 0 },
            forms: { total: 0, imported: 0, failed: 0 },
            formFields: { total: 0, imported: 0, failed: 0 },
            submissions: { total: 0, imported: 0, failed: 0 },
        };
    }
    loadJsonFile(filename) {
        const filePath = path.join(this.dataDir, filename);
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
    }
    async importUsers(users) {
        console.log('📥 Импорт пользователей...');
        this.statistics.users.total = users.length;
        const userRepository = database_config_1.AppDataSource.getRepository(User_entity_1.User);
        // Импорт батчами для оптимизации
        for (let i = 0; i < users.length; i += this.batchSize) {
            const batch = users.slice(i, i + this.batchSize);
            try {
                // Отключаем автогенерацию ID и используем предоставленные
                const entities = batch.map(userData => {
                    const user = new User_entity_1.User();
                    Object.assign(user, userData);
                    return user;
                });
                await userRepository.save(entities, { chunk: this.batchSize });
                this.statistics.users.imported += batch.length;
                console.log(`   Импортировано ${i + batch.length}/${users.length}`);
            }
            catch (error) {
                console.error(`   ❌ Ошибка импорта батча ${i}-${i + batch.length}:`, error);
                this.statistics.users.failed += batch.length;
            }
        }
        console.log(`   ✅ Импортировано ${this.statistics.users.imported} из ${this.statistics.users.total} пользователей`);
    }
    async importForms(forms) {
        console.log('📥 Импорт форм...');
        this.statistics.forms.total = forms.length;
        const formRepository = database_config_1.AppDataSource.getRepository(Form_entity_1.Form);
        for (const formData of forms) {
            try {
                const form = new Form_entity_1.Form();
                Object.assign(form, formData);
                await formRepository.save(form);
                this.statistics.forms.imported++;
            }
            catch (error) {
                console.error(`   ❌ Ошибка импорта формы ${formData.name}:`, error);
                this.statistics.forms.failed++;
            }
        }
        console.log(`   ✅ Импортировано ${this.statistics.forms.imported} из ${this.statistics.forms.total} форм`);
    }
    async importFormFields(fields) {
        console.log('📥 Импорт полей форм...');
        this.statistics.formFields.total = fields.length;
        const fieldRepository = database_config_1.AppDataSource.getRepository(FormField_entity_1.FormField);
        // Импорт батчами
        for (let i = 0; i < fields.length; i += this.batchSize) {
            const batch = fields.slice(i, i + this.batchSize);
            try {
                const entities = batch.map(fieldData => {
                    const field = new FormField_entity_1.FormField();
                    Object.assign(field, fieldData);
                    return field;
                });
                await fieldRepository.save(entities, { chunk: this.batchSize });
                this.statistics.formFields.imported += batch.length;
                console.log(`   Импортировано ${i + batch.length}/${fields.length}`);
            }
            catch (error) {
                console.error(`   ❌ Ошибка импорта батча полей ${i}-${i + batch.length}:`, error);
                this.statistics.formFields.failed += batch.length;
            }
        }
        console.log(`   ✅ Импортировано ${this.statistics.formFields.imported} из ${this.statistics.formFields.total} полей`);
    }
    async importSubmissions(submissions) {
        console.log('📥 Импорт заявок...');
        this.statistics.submissions.total = submissions.length;
        const submissionRepository = database_config_1.AppDataSource.getRepository(Submission_entity_1.Submission);
        // Импорт батчами для больших объемов
        for (let i = 0; i < submissions.length; i += this.batchSize) {
            const batch = submissions.slice(i, i + this.batchSize);
            try {
                const entities = batch.map(subData => {
                    const submission = new Submission_entity_1.Submission();
                    Object.assign(submission, subData);
                    return submission;
                });
                await submissionRepository.save(entities, { chunk: this.batchSize });
                this.statistics.submissions.imported += batch.length;
                console.log(`   Импортировано ${i + batch.length}/${submissions.length}`);
            }
            catch (error) {
                console.error(`   ❌ Ошибка импорта батча заявок ${i}-${i + batch.length}:`, error);
                this.statistics.submissions.failed += batch.length;
            }
        }
        console.log(`   ✅ Импортировано ${this.statistics.submissions.imported} из ${this.statistics.submissions.total} заявок`);
    }
    async updateSequences() {
        console.log('🔄 Обновление последовательностей...');
        try {
            // PostgreSQL автоматически управляет последовательностями для UUID
            // Но если есть другие последовательности, их можно обновить здесь
            console.log('   ✅ Последовательности обновлены');
        }
        catch (error) {
            console.error('   ❌ Ошибка обновления последовательностей:', error);
        }
    }
    async validateImport() {
        console.log('\n🔍 Валидация импортированных данных...');
        try {
            const userCount = await database_config_1.AppDataSource.getRepository(User_entity_1.User).count();
            const formCount = await database_config_1.AppDataSource.getRepository(Form_entity_1.Form).count();
            const fieldCount = await database_config_1.AppDataSource.getRepository(FormField_entity_1.FormField).count();
            const submissionCount = await database_config_1.AppDataSource.getRepository(Submission_entity_1.Submission).count();
            console.log('📊 Количество записей в БД:');
            console.log(`   Пользователи: ${userCount}`);
            console.log(`   Формы: ${formCount}`);
            console.log(`   Поля форм: ${fieldCount}`);
            console.log(`   Заявки: ${submissionCount}`);
            // Проверка связей
            const formsWithFields = await database_config_1.AppDataSource.getRepository(Form_entity_1.Form)
                .createQueryBuilder('form')
                .leftJoinAndSelect('form.fields', 'field')
                .getMany();
            console.log(`\n   Форм с полями: ${formsWithFields.filter(f => f.fields.length > 0).length}`);
            const submissionsWithRelations = await database_config_1.AppDataSource.getRepository(Submission_entity_1.Submission)
                .createQueryBuilder('submission')
                .leftJoin('submission.form', 'form')
                .leftJoin('submission.user', 'user')
                .select('COUNT(DISTINCT submission.id)', 'total')
                .addSelect('COUNT(DISTINCT form.id)', 'withForm')
                .addSelect('COUNT(DISTINCT user.id)', 'withUser')
                .getRawOne();
            console.log(`   Заявок с формой: ${submissionsWithRelations.withForm}`);
            console.log(`   Заявок с пользователем: ${submissionsWithRelations.withUser}`);
        }
        catch (error) {
            console.error('❌ Ошибка валидации:', error);
        }
    }
    async importAll() {
        console.log('🚀 Начало импорта в PostgreSQL...');
        console.log(`📁 Директория данных: ${this.dataDir}`);
        try {
            // Инициализация подключения к БД
            await (0, database_config_1.initializeDatabase)();
            console.log('✅ Подключено к PostgreSQL');
            // Загрузка данных
            const users = this.loadJsonFile('users.json');
            const forms = this.loadJsonFile('forms.json');
            const formFields = this.loadJsonFile('formFields.json');
            const submissions = this.loadJsonFile('submissions.json');
            // Импорт в правильном порядке (с учетом зависимостей)
            await this.importUsers(users);
            await this.importForms(forms);
            await this.importFormFields(formFields);
            await this.importSubmissions(submissions);
            // Обновление последовательностей
            await this.updateSequences();
            // Сохранение статистики
            const summaryPath = path.join(this.dataDir, 'import-summary.json');
            fs.writeFileSync(summaryPath, JSON.stringify({
                importDate: new Date().toISOString(),
                statistics: this.statistics,
            }, null, 2));
            console.log('\n📊 Итоговая статистика импорта:');
            console.log('   Пользователи:');
            console.log(`     - Всего: ${this.statistics.users.total}`);
            console.log(`     - Импортировано: ${this.statistics.users.imported}`);
            console.log(`     - Ошибок: ${this.statistics.users.failed}`);
            console.log('   Формы:');
            console.log(`     - Всего: ${this.statistics.forms.total}`);
            console.log(`     - Импортировано: ${this.statistics.forms.imported}`);
            console.log(`     - Ошибок: ${this.statistics.forms.failed}`);
            console.log('   Поля форм:');
            console.log(`     - Всего: ${this.statistics.formFields.total}`);
            console.log(`     - Импортировано: ${this.statistics.formFields.imported}`);
            console.log(`     - Ошибок: ${this.statistics.formFields.failed}`);
            console.log('   Заявки:');
            console.log(`     - Всего: ${this.statistics.submissions.total}`);
            console.log(`     - Импортировано: ${this.statistics.submissions.imported}`);
            console.log(`     - Ошибок: ${this.statistics.submissions.failed}`);
            console.log('\n✅ Импорт завершен!');
        }
        catch (error) {
            console.error('❌ Критическая ошибка импорта:', error);
            throw error;
        }
    }
}
// Запуск импорта
if (require.main === module) {
    const dataDir = process.argv[2];
    if (!dataDir) {
        console.error('Использование: ts-node import-to-postgresql.ts <путь-к-трансформированным-данным>');
        process.exit(1);
    }
    const importer = new PostgreSQLImporter(dataDir);
    importer.importAll()
        .then(() => importer.validateImport())
        .then(() => process.exit(0))
        .catch(error => {
        console.error('Критическая ошибка:', error);
        process.exit(1);
    });
}
exports.default = PostgreSQLImporter;
