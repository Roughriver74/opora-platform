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
var SubmissionHistory_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubmissionHistory = exports.HistoryActionType = void 0;
const typeorm_1 = require("typeorm");
const class_validator_1 = require("class-validator");
const BaseEntity_1 = require("./base/BaseEntity");
const Submission_entity_1 = require("./Submission.entity");
const User_entity_1 = require("./User.entity");
var HistoryActionType;
(function (HistoryActionType) {
    HistoryActionType["CREATE"] = "create";
    HistoryActionType["UPDATE"] = "update";
    HistoryActionType["STATUS_CHANGE"] = "status_change";
    HistoryActionType["ASSIGN"] = "assign";
    HistoryActionType["COMMENT"] = "comment";
    HistoryActionType["SYNC_BITRIX"] = "sync_bitrix";
    HistoryActionType["DELETE"] = "delete";
})(HistoryActionType || (exports.HistoryActionType = HistoryActionType = {}));
let SubmissionHistory = SubmissionHistory_1 = class SubmissionHistory extends BaseEntity_1.BaseEntity {
    static createEntry(submissionId, actionType, description, userId, changes, metadata) {
        const entry = new SubmissionHistory_1();
        entry.submissionId = submissionId;
        entry.actionType = actionType;
        entry.description = description;
        entry.userId = userId;
        entry.changes = changes;
        entry.metadata = metadata;
        return entry;
    }
    isSystemAction() {
        return !this.userId;
    }
    getFormattedDescription() {
        const userPrefix = this.user ? `${this.user.fullName}: ` : 'Система: ';
        return userPrefix + this.description;
    }
    toPublicJSON() {
        const { submission, user, ...publicHistory } = this;
        return {
            ...publicHistory,
            userName: user?.fullName,
            userEmail: user?.email,
        };
    }
};
exports.SubmissionHistory = SubmissionHistory;
__decorate([
    (0, typeorm_1.ManyToOne)(() => Submission_entity_1.Submission, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'submission_id' }),
    __metadata("design:type", Submission_entity_1.Submission)
], SubmissionHistory.prototype, "submission", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'submission_id' }),
    __metadata("design:type", String)
], SubmissionHistory.prototype, "submissionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_entity_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", User_entity_1.User)
], SubmissionHistory.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true, name: 'user_id' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SubmissionHistory.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: HistoryActionType,
    }),
    __metadata("design:type", String)
], SubmissionHistory.prototype, "actionType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SubmissionHistory.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], SubmissionHistory.prototype, "changes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], SubmissionHistory.prototype, "metadata", void 0);
exports.SubmissionHistory = SubmissionHistory = SubmissionHistory_1 = __decorate([
    (0, typeorm_1.Entity)('submission_history'),
    (0, typeorm_1.Index)(['submissionId', 'createdAt']),
    (0, typeorm_1.Index)(['userId', 'createdAt']),
    (0, typeorm_1.Index)(['actionType', 'createdAt'])
], SubmissionHistory);
