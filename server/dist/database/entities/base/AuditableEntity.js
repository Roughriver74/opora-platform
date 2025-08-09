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
exports.AuditableEntity = void 0;
const typeorm_1 = require("typeorm");
const BaseEntity_1 = require("./BaseEntity");
const User_entity_1 = require("../User.entity");
class AuditableEntity extends BaseEntity_1.BaseEntity {
    constructor() {
        super(...arguments);
        this.currentUserId = null;
    }
    setCurrentUser(userId) {
        this.currentUserId = userId;
    }
    setCreatedBy() {
        if (this.currentUserId) {
            this.createdBy = this.currentUserId;
            this.updatedBy = this.currentUserId;
        }
        this.changeHistory = [];
    }
    setUpdatedBy() {
        if (this.currentUserId) {
            this.updatedBy = this.currentUserId;
        }
        this.addChangeHistoryEntry();
    }
    addChangeHistoryEntry() {
        if (!this.changeHistory) {
            this.changeHistory = [];
        }
        const changes = this.getChangedFields();
        if (changes.length > 0) {
            const entry = {
                timestamp: new Date(),
                userId: this.currentUserId,
                changes: changes,
            };
            this.changeHistory.push(entry);
        }
    }
    getChangedFields() {
        // @ts-ignore
        const metadata = this.constructor.getRepository().metadata;
        const changes = [];
        for (const column of metadata.columns) {
            const propertyName = column.propertyName;
            const databaseValue = column.getEntityValue(this);
            if (this.hasId() && column.isUpdate) {
                const originalValue = this[`__original_${propertyName}`];
                if (originalValue !== undefined && originalValue !== databaseValue) {
                    changes.push({
                        field: propertyName,
                        oldValue: originalValue,
                        newValue: databaseValue,
                    });
                }
            }
        }
        return changes;
    }
    getChangeCount() {
        return this.changeHistory?.length || 0;
    }
    getLastChange() {
        if (!this.changeHistory || this.changeHistory.length === 0) {
            return null;
        }
        return this.changeHistory[this.changeHistory.length - 1];
    }
    getChangesByUser(userId) {
        if (!this.changeHistory) {
            return [];
        }
        return this.changeHistory.filter(entry => entry.userId === userId);
    }
    getChangesByField(fieldName) {
        if (!this.changeHistory) {
            return [];
        }
        const allChanges = [];
        for (const entry of this.changeHistory) {
            const fieldChanges = entry.changes.filter(change => change.field === fieldName);
            allChanges.push(...fieldChanges);
        }
        return allChanges;
    }
}
exports.AuditableEntity = AuditableEntity;
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], AuditableEntity.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], AuditableEntity.prototype, "updatedBy", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_entity_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'createdBy' }),
    __metadata("design:type", User_entity_1.User)
], AuditableEntity.prototype, "creator", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_entity_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'updatedBy' }),
    __metadata("design:type", User_entity_1.User)
], AuditableEntity.prototype, "updater", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Array)
], AuditableEntity.prototype, "changeHistory", void 0);
__decorate([
    (0, typeorm_1.BeforeInsert)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AuditableEntity.prototype, "setCreatedBy", null);
__decorate([
    (0, typeorm_1.BeforeUpdate)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AuditableEntity.prototype, "setUpdatedBy", null);
