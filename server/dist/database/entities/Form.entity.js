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
exports.Form = void 0;
const typeorm_1 = require("typeorm");
const class_validator_1 = require("class-validator");
const BaseEntity_1 = require("./base/BaseEntity");
const FormField_entity_1 = require("./FormField.entity");
const Submission_entity_1 = require("./Submission.entity");
let Form = class Form extends BaseEntity_1.BaseEntity {
    getActiveFields() {
        return this.fields?.filter(field => field !== null) || [];
    }
    getRequiredFields() {
        return this.fields?.filter(field => field.required) || [];
    }
    getFieldByName(name) {
        return this.fields?.find(field => field.name === name);
    }
    getFieldsBySection(sectionId) {
        return this.fields?.filter(field => field.sectionId === sectionId) || [];
    }
    getFieldCount() {
        return this.fields?.length || 0;
    }
    toPublicJSON() {
        const { submissions, ...publicForm } = this;
        return publicForm;
    }
};
exports.Form = Form;
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, unique: true }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], Form.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], Form.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], Form.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], Form.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], Form.prototype, "bitrixDealCategory", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'text',
        default: 'Спасибо! Ваша заявка успешно отправлена.',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], Form.prototype, "successMessage", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => FormField_entity_1.FormField, field => field.form, {
        cascade: true,
        eager: true,
    }),
    __metadata("design:type", Array)
], Form.prototype, "fields", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Submission_entity_1.Submission, submission => submission.form),
    __metadata("design:type", Array)
], Form.prototype, "submissions", void 0);
exports.Form = Form = __decorate([
    (0, typeorm_1.Entity)('forms'),
    (0, typeorm_1.Index)(['name'], { unique: true }),
    (0, typeorm_1.Index)(['isActive'])
], Form);
