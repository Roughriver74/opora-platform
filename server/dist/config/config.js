"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const config = {
    port: process.env.PORT || 5001,
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/beton-crm-production',
    bitrix24WebhookUrl: process.env.BITRIX24_WEBHOOK_URL ||
        'https://crm.betonexpress.pro/rest/3/74sbx907svrq1v10/',
    redisUrl: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6396}`,
};
exports.default = config;
