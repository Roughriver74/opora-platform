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
var Settings_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Settings = exports.SettingCategory = void 0;
const typeorm_1 = require("typeorm");
const class_validator_1 = require("class-validator");
const BaseEntity_1 = require("./base/BaseEntity");
var SettingCategory;
(function (SettingCategory) {
    SettingCategory["SYSTEM"] = "system";
    SettingCategory["BITRIX"] = "bitrix";
    SettingCategory["EMAIL"] = "email";
    SettingCategory["NOTIFICATION"] = "notification";
    SettingCategory["SECURITY"] = "security";
    SettingCategory["UI"] = "ui";
})(SettingCategory || (exports.SettingCategory = SettingCategory = {}));
let Settings = Settings_1 = class Settings extends BaseEntity_1.BaseEntity {
    validateValue() {
        if (this.validation) {
            // Простая валидация на основе правил
            const { type, min, max, pattern, enum: enumValues, required } = this.validation;
            if (required && (this.value === null || this.value === undefined)) {
                throw new Error(`Настройка ${this.key} обязательна`);
            }
            if (type) {
                const valueType = typeof this.value;
                if (type === 'number' && valueType !== 'number') {
                    throw new Error(`Настройка ${this.key} должна быть числом`);
                }
                if (type === 'string' && valueType !== 'string') {
                    throw new Error(`Настройка ${this.key} должна быть строкой`);
                }
                if (type === 'boolean' && valueType !== 'boolean') {
                    throw new Error(`Настройка ${this.key} должна быть булевым значением`);
                }
            }
            if (typeof this.value === 'number') {
                if (min !== undefined && this.value < min) {
                    throw new Error(`Настройка ${this.key} не может быть меньше ${min}`);
                }
                if (max !== undefined && this.value > max) {
                    throw new Error(`Настройка ${this.key} не может быть больше ${max}`);
                }
            }
            if (pattern && typeof this.value === 'string') {
                const regex = new RegExp(pattern);
                if (!regex.test(this.value)) {
                    throw new Error(`Настройка ${this.key} не соответствует формату`);
                }
            }
            if (enumValues && enumValues.length > 0) {
                if (!enumValues.includes(this.value)) {
                    throw new Error(`Настройка ${this.key} должна быть одним из: ${enumValues.join(', ')}`);
                }
            }
        }
    }
    static createSetting(key, value, category = SettingCategory.SYSTEM, description) {
        const setting = new Settings_1();
        setting.key = key;
        setting.value = value;
        setting.category = category;
        setting.description = description;
        return setting;
    }
    getValue() {
        return this.value;
    }
    updateValue(newValue) {
        this.value = newValue;
    }
    toPublicJSON() {
        if (!this.isPublic) {
            return null;
        }
        const { isEncrypted, ...publicSetting } = this;
        if (isEncrypted) {
            return {
                ...publicSetting,
                value: '***encrypted***',
            };
        }
        return publicSetting;
    }
};
exports.Settings = Settings;
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, unique: true }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], Settings.prototype, "key", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb' }),
    __metadata("design:type", Object)
], Settings.prototype, "value", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: SettingCategory,
        default: SettingCategory.SYSTEM,
    }),
    __metadata("design:type", String)
], Settings.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], Settings.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Settings.prototype, "isPublic", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Settings.prototype, "isEncrypted", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], Settings.prototype, "validation", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], Settings.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.BeforeInsert)(),
    (0, typeorm_1.BeforeUpdate)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], Settings.prototype, "validateValue", null);
exports.Settings = Settings = Settings_1 = __decorate([
    (0, typeorm_1.Entity)('settings'),
    (0, typeorm_1.Index)(['key'], { unique: true }),
    (0, typeorm_1.Index)(['category'])
], Settings);
