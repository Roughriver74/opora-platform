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
exports.FormField = void 0;
const typeorm_1 = require("typeorm");
const class_validator_1 = require("class-validator");
const BaseEntity_1 = require("./base/BaseEntity");
const Form_entity_1 = require("./Form.entity");
let FormField = class FormField extends BaseEntity_1.BaseEntity {
    isDropdown() {
        return this.type === 'dropdown' || this.type === 'select';
    }
    isDynamic() {
        return this.dynamicSource?.enabled === true;
    }
    isLinked() {
        return this.linkedFields?.enabled === true;
    }
    hasOptions() {
        return Array.isArray(this.options) && this.options.length > 0;
    }
    getOptionByValue(value) {
        return this.options?.find(opt => opt.value === value);
    }
    getLinkedTargetFields() {
        if (!this.linkedFields?.enabled || !this.linkedFields.mappings) {
            return [];
        }
        return this.linkedFields.mappings.map(m => m.targetFieldName);
    }
    toPublicJSON() {
        const { form, ...publicField } = this;
        return publicField;
    }
};
exports.FormField = FormField;
__decorate([
    (0, typeorm_1.ManyToOne)(() => Form_entity_1.Form, form => form.fields, {
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'form_id' }),
    __metadata("design:type", Form_entity_1.Form)
], FormField.prototype, "form", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'form_id' }),
    __metadata("design:type", String)
], FormField.prototype, "formId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], FormField.prototype, "sectionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], FormField.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], FormField.prototype, "label", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50 }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], FormField.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], FormField.prototype, "required", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], FormField.prototype, "placeholder", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], FormField.prototype, "bitrixFieldId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], FormField.prototype, "bitrixFieldType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], FormField.prototype, "bitrixEntity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], FormField.prototype, "options", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], FormField.prototype, "dynamicSource", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], FormField.prototype, "linkedFields", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], FormField.prototype, "order", void 0);
exports.FormField = FormField = __decorate([
    (0, typeorm_1.Entity)('form_fields'),
    (0, typeorm_1.Index)(['formId', 'order']),
    (0, typeorm_1.Index)(['formId', 'sectionId', 'order']),
    (0, typeorm_1.Index)(['name', 'formId']),
    (0, typeorm_1.Index)(['type'])
], FormField);
