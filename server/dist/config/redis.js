"use strict";
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
            url: config_1.default.redisUrl || `redis://localhost:${process.env.REDIS_PORT || 6396}`,
            socket: {
                connectTimeout: 5000,
            },
        });
        this.client.on('error', (err) => {
            console.warn('⚠️ Redis error (working without cache):', err.message);
        });
        this.client.on('connect', () => {
        });
        this.client.on('ready', () => {
        });
        this.client.on('end', () => {
        });
    }
    static getInstance() {
        if (!RedisClient.instance) {
            RedisClient.instance = new RedisClient();
        }
        return RedisClient.instance;
    }
    async connect() {
        try {
            if (!this.client.isOpen) {
                await this.client.connect();
            }
        }
        catch (error) {
            console.warn('⚠️ Failed to connect to Redis - working without cache:', error);
        }
    }
    async disconnect() {
        try {
            if (this.client.isOpen) {
                await this.client.disconnect();
            }
        }
        catch (error) {
            console.warn('⚠️ Error disconnecting from Redis:', error);
        }
    }
    async get(key) {
        try {
            if (!this.client.isOpen) {
                return null;
            }
            return await this.client.get(key);
        }
        catch (error) {
            console.warn(`⚠️ Redis GET error for key ${key}:`, error);
            return null;
        }
    }
    async set(key, value, ttlSeconds) {
        try {
            if (!this.client.isOpen) {
                return false;
            }
            if (ttlSeconds) {
                await this.client.setEx(key, ttlSeconds, value);
            }
            else {
                await this.client.set(key, value);
            }
            return true;
        }
        catch (error) {
            console.warn(`⚠️ Redis SET error for key ${key}:`, error);
            return false;
        }
    }
    async del(key) {
        try {
            if (!this.client.isOpen) {
                return false;
            }
            await this.client.del(key);
            return true;
        }
        catch (error) {
            console.warn(`⚠️ Redis DEL error for key ${key}:`, error);
            return false;
        }
    }
    async exists(key) {
        try {
            if (!this.client.isOpen) {
                return false;
            }
            const result = await this.client.exists(key);
            return result === 1;
        }
        catch (error) {
            console.warn(`⚠️ Redis EXISTS error for key ${key}:`, error);
            return false;
        }
    }
    async keys(pattern) {
        try {
            if (!this.client.isOpen) {
                return [];
            }
            return await this.client.keys(pattern);
        }
        catch (error) {
            console.warn(`⚠️ Redis KEYS error for pattern ${pattern}:`, error);
            return [];
        }
    }
    async flushPattern(pattern) {
        try {
            const keys = await this.keys(pattern);
            if (keys.length > 0) {
                await this.client.del(keys);
            }
        }
        catch (error) {
            console.warn(`⚠️ Redis FLUSH error for pattern ${pattern}:`, error);
        }
    }
    isConnected() {
        return this.client?.isOpen || false;
    }
}
exports.RedisClient = RedisClient;
exports.default = RedisClient.getInstance();
