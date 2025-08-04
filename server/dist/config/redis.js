"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisClient = void 0;
const redis_1 = require("redis");
const config_1 = __importDefault(require("./config"));
class RedisClient {
    constructor() {
        this.client = (0, redis_1.createClient)({
            url: config_1.default.redisUrl || 'redis://localhost:6379',
            socket: {
                connectTimeout: 5000,
            },
        });
        this.client.on('error', (err) => {
            console.warn('⚠️ Redis error (working without cache):', err.message);
        });
        this.client.on('connect', () => {
            console.log('✅ Redis connected successfully');
        });
        this.client.on('ready', () => {
            console.log('🚀 Redis ready for operations');
        });
        this.client.on('end', () => {
            console.log('⚠️ Redis connection ended');
        });
    }
    static getInstance() {
        if (!RedisClient.instance) {
            RedisClient.instance = new RedisClient();
        }
        return RedisClient.instance;
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.client.isOpen) {
                    yield this.client.connect();
                }
            }
            catch (error) {
                console.warn('⚠️ Failed to connect to Redis - working without cache:', error);
            }
        });
    }
    disconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this.client.isOpen) {
                    yield this.client.disconnect();
                }
            }
            catch (error) {
                console.warn('⚠️ Error disconnecting from Redis:', error);
            }
        });
    }
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.client.isOpen) {
                    return null;
                }
                return yield this.client.get(key);
            }
            catch (error) {
                console.warn(`⚠️ Redis GET error for key ${key}:`, error);
                return null;
            }
        });
    }
    set(key, value, ttlSeconds) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.client.isOpen) {
                    return false;
                }
                if (ttlSeconds) {
                    yield this.client.setEx(key, ttlSeconds, value);
                }
                else {
                    yield this.client.set(key, value);
                }
                return true;
            }
            catch (error) {
                console.warn(`⚠️ Redis SET error for key ${key}:`, error);
                return false;
            }
        });
    }
    del(key) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.client.isOpen) {
                    return false;
                }
                yield this.client.del(key);
                return true;
            }
            catch (error) {
                console.warn(`⚠️ Redis DEL error for key ${key}:`, error);
                return false;
            }
        });
    }
    exists(key) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.client.isOpen) {
                    return false;
                }
                const result = yield this.client.exists(key);
                return result === 1;
            }
            catch (error) {
                console.warn(`⚠️ Redis EXISTS error for key ${key}:`, error);
                return false;
            }
        });
    }
    keys(pattern) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.client.isOpen) {
                    return [];
                }
                return yield this.client.keys(pattern);
            }
            catch (error) {
                console.warn(`⚠️ Redis KEYS error for pattern ${pattern}:`, error);
                return [];
            }
        });
    }
    flushPattern(pattern) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const keys = yield this.keys(pattern);
                if (keys.length > 0) {
                    yield this.client.del(keys);
                }
            }
            catch (error) {
                console.warn(`⚠️ Redis FLUSH error for pattern ${pattern}:`, error);
            }
        });
    }
    isConnected() {
        var _a;
        return ((_a = this.client) === null || _a === void 0 ? void 0 : _a.isOpen) || false;
    }
}
exports.RedisClient = RedisClient;
exports.default = RedisClient.getInstance();
