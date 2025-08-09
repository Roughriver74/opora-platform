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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AdminToken_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminToken = void 0;
const typeorm_1 = require("typeorm");
const class_validator_1 = require("class-validator");
const BaseEntity_1 = require("./base/BaseEntity");
const User_entity_1 = require("./User.entity");
const crypto = __importStar(require("crypto"));
let AdminToken = AdminToken_1 = class AdminToken extends BaseEntity_1.BaseEntity {
    generateToken() {
        if (!this.token) {
            this.token = crypto.randomBytes(32).toString('hex');
        }
        if (!this.expiresAt) {
            // По умолчанию токен действует 30 дней
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + 30);
            this.expiresAt = expirationDate;
        }
    }
    isExpired() {
        return new Date() > new Date(this.expiresAt);
    }
    isValid() {
        return this.isActive && !this.isExpired();
    }
    markAsUsed(ipAddress, userAgent) {
        this.lastUsedAt = new Date();
        if (ipAddress)
            this.ipAddress = ipAddress;
        if (userAgent)
            this.userAgent = userAgent;
    }
    revoke() {
        this.isActive = false;
    }
    getDaysUntilExpiration() {
        const now = new Date();
        const expiration = new Date(this.expiresAt);
        const diffTime = expiration.getTime() - now.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    static createToken(userId, purpose, expirationDays = 30) {
        const token = new AdminToken_1();
        token.userId = userId;
        token.purpose = purpose;
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + expirationDays);
        token.expiresAt = expirationDate;
        return token;
    }
    toPublicJSON() {
        const { token, user, ...publicToken } = this;
        return {
            ...publicToken,
            tokenPreview: this.token.substring(0, 8) + '...',
            userName: user?.fullName,
            userEmail: user?.email,
        };
    }
};
exports.AdminToken = AdminToken;
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, unique: true }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AdminToken.prototype, "token", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", User_entity_1.User)
], AdminToken.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'user_id' }),
    __metadata("design:type", String)
], AdminToken.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AdminToken.prototype, "purpose", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], AdminToken.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], AdminToken.prototype, "lastUsedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], AdminToken.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 45, nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AdminToken.prototype, "ipAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AdminToken.prototype, "userAgent", void 0);
__decorate([
    (0, typeorm_1.BeforeInsert)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminToken.prototype, "generateToken", null);
exports.AdminToken = AdminToken = AdminToken_1 = __decorate([
    (0, typeorm_1.Entity)('admin_tokens'),
    (0, typeorm_1.Index)(['token'], { unique: true }),
    (0, typeorm_1.Index)(['userId']),
    (0, typeorm_1.Index)(['isActive', 'expiresAt'])
], AdminToken);
