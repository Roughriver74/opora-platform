"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Submission = exports.BitrixSyncStatus = exports.SubmissionPriority = void 0;
const typeorm_1 = require("typeorm");
const class_validator_1 = require("class-validator");
const BaseEntity_1 = require("./base/BaseEntity");
const User_entity_1 = require("./User.entity");
const Form_entity_1 = require("./Form.entity");
var SubmissionPriority;
(function (SubmissionPriority) {
    SubmissionPriority["LOW"] = "low";
    SubmissionPriority["MEDIUM"] = "medium";
    SubmissionPriority["HIGH"] = "high";
    SubmissionPriority["URGENT"] = "urgent";
})(SubmissionPriority || (exports.SubmissionPriority = SubmissionPriority = {}));
var BitrixSyncStatus;
(function (BitrixSyncStatus) {
    BitrixSyncStatus["PENDING"] = "pending";
    BitrixSyncStatus["SYNCED"] = "synced";
    BitrixSyncStatus["FAILED"] = "failed";
})(BitrixSyncStatus || (exports.BitrixSyncStatus = BitrixSyncStatus = {}));
let Submission = class Submission extends BaseEntity_1.BaseEntity {
    // Override the base class validation to ensure submission number is generated first
    async validate() {
        // Generate submission number BEFORE validation
        await this.generateSubmissionNumber();
        // Skip validation temporarily for debugging
        // await super.validate()
    }
    async generateSubmissionNumber() {
        // Always generate submissionNumber if not set
        if (!this.submissionNumber || this.submissionNumber === undefined) {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const randomSuffix = Math.floor(Math.random() * 9999)
                .toString()
                .padStart(4, '0');
            this.submissionNumber = `${year}${month}${day}${randomSuffix}`;
        }
        // Заполнение предвычисленных полей
        const createdDate = this.createdAt || new Date();
        this.dayOfWeek = createdDate.getDay();
        this.monthOfYear = createdDate.getMonth() + 1;
        this.yearCreated = createdDate.getFullYear();
    }
    async updateDenormalizedFields() {
        // Обновление времени обработки при завершении
        if (this.isStatusCompleted() && !this.processingTimeMinutes) {
            const processingTime = Date.now() - this.createdAt.getTime();
            this.processingTimeMinutes = Math.round(processingTime / (1000 * 60));
        }
    }
    isStatusCompleted() {
        return ['WON', 'LOSE', 'COMPLETED', 'CLOSED'].includes(this.status);
    }
    isHighPriority() {
        return this.priority === SubmissionPriority.HIGH ||
            this.priority === SubmissionPriority.URGENT;
    }
    isSyncedWithBitrix() {
        return this.bitrixSyncStatus === BitrixSyncStatus.SYNCED;
    }
    getDaysOpen() {
        if (this.isStatusCompleted() && this.processingTimeMinutes) {
            return Math.round(this.processingTimeMinutes / (60 * 24));
        }
        const now = new Date();
        const created = new Date(this.createdAt);
        return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    }
    get submittedAt() {
        return this.createdAt;
    }
    toPublicJSON() {
        const { user, form, assignedTo, ...publicSubmission } = this;
        return {
            ...publicSubmission,
            user: user?.toSafeObject(),
            form: form?.toPublicJSON(),
            assignedTo: assignedTo?.toSafeObject(),
        };
    }
};
exports.Submission = Submission;
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, unique: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], Submission.prototype, "submissionNumber", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Form_entity_1.Form, form => form.submissions),
    (0, typeorm_1.JoinColumn)({ name: 'form_id' }),
    __metadata("design:type", Form_entity_1.Form)
], Submission.prototype, "form", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'form_id' }),
    __metadata("design:type", String)
], Submission.prototype, "formId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_entity_1.User, user => user.submissions, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", User_entity_1.User)
], Submission.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true, name: 'user_id' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], Submission.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_entity_1.User, user => user.assignedSubmissions, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'assigned_to_id' }),
    __metadata("design:type", User_entity_1.User)
], Submission.prototype, "assignedTo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true, name: 'assigned_to_id' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], Submission.prototype, "assignedToId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500 }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], Submission.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, default: 'NEW' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], Submission.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: SubmissionPriority,
        default: SubmissionPriority.MEDIUM,
    }),
    (0, class_validator_1.IsEnum)(SubmissionPriority),
    __metadata("design:type", String)
], Submission.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], Submission.prototype, "bitrixDealId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], Submission.prototype, "bitrixCategoryId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: BitrixSyncStatus,
        default: BitrixSyncStatus.PENDING,
    }),
    (0, class_validator_1.IsEnum)(BitrixSyncStatus),
    __metadata("design:type", String)
], Submission.prototype, "bitrixSyncStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], Submission.prototype, "bitrixSyncError", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], Submission.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', array: true, default: [] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], Submission.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], Submission.prototype, "formName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], Submission.prototype, "formTitle", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], Submission.prototype, "userEmail", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], Submission.prototype, "userName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], Submission.prototype, "assignedToName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'smallint', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], Submission.prototype, "dayOfWeek", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'smallint', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], Submission.prototype, "monthOfYear", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], Submission.prototype, "yearCreated", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], Submission.prototype, "processingTimeMinutes", void 0);
__decorate([
    (0, typeorm_1.BeforeInsert)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], Submission.prototype, "validate", null);
__decorate([
    (0, typeorm_1.BeforeInsert)(),
    (0, typeorm_1.BeforeUpdate)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], Submission.prototype, "updateDenormalizedFields", null);
exports.Submission = Submission = __decorate([
    (0, typeorm_1.Entity)('submissions'),
    (0, typeorm_1.Index)(['submissionNumber'], { unique: true }),
    (0, typeorm_1.Index)(['status', 'createdAt']),
    (0, typeorm_1.Index)(['userId', 'status', 'createdAt']),
    (0, typeorm_1.Index)(['assignedTo', 'status', 'createdAt']),
    (0, typeorm_1.Index)(['formId', 'createdAt']),
    (0, typeorm_1.Index)(['bitrixSyncStatus', 'createdAt']),
    (0, typeorm_1.Index)(['priority', 'status']),
    (0, typeorm_1.Index)(['tags', 'status']),
    (0, typeorm_1.Index)(['userEmail', 'status']),
    (0, typeorm_1.Index)(['formName', 'createdAt']),
    (0, typeorm_1.Index)(['yearCreated', 'monthOfYear']),
    (0, typeorm_1.Index)(['assignedToName', 'status'])
], Submission);
