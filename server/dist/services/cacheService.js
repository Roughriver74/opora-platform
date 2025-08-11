"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formCache = exports.bitrixCache = exports.cacheService = exports.FormCacheService = exports.BitrixCacheService = exports.CacheService = void 0;
// Временный in-memory кэш вместо Redis
const memoryCache = new Map();
class CacheService {
    constructor() {
        this.defaultTTL = 3600; // 1 hour
        this.defaultPrefix = 'beton-crm';
    }
    /**
     * Get cached data by key
     */
    async get(key, options) {
        try {
            const fullKey = this.buildKey(key, options?.prefix);
            const cached = memoryCache.get(fullKey);
            if (cached && cached.expires > Date.now()) {
                return cached.data;
            }
            // Удаляем устаревший кэш
            if (cached && cached.expires <= Date.now()) {
                memoryCache.delete(fullKey);
            }
            return null;
        }
        catch (error) {
            console.warn('⚠️ Cache GET error:', error);
            return null;
        }
    }
    /**
     * Set data in cache
     */
    async set(key, data, options) {
        try {
            const fullKey = this.buildKey(key, options?.prefix);
            const ttl = options?.ttl || this.defaultTTL;
            const expires = Date.now() + (ttl * 1000);
            memoryCache.set(fullKey, { data, expires });
            return true;
        }
        catch (error) {
            console.warn('⚠️ Cache SET error:', error);
            return false;
        }
    }
    /**
     * Delete cached data
     */
    async del(key, options) {
        try {
            const fullKey = this.buildKey(key, options?.prefix);
            const success = memoryCache.delete(fullKey);
            if (success) {
            }
            return success;
        }
        catch (error) {
            console.warn('⚠️ Cache DEL error:', error);
            return false;
        }
    }
    /**
     * Get or set pattern - tries to get, if not found executes setter and caches result
     */
    async getOrSet(key, setter, options) {
        const cached = await this.get(key, options);
        if (cached !== null) {
            return cached;
        }
        try {
            const data = await setter();
            await this.set(key, data, options);
            return data;
        }
        catch (error) {
            console.warn('⚠️ Cache getOrSet setter error:', error);
            return null;
        }
    }
    /**
     * Clear all cache entries with pattern
     */
    async clearPattern(pattern, options) {
        try {
            const fullPattern = this.buildKey(pattern, options?.prefix);
            const keysToDelete = [];
            for (const key of memoryCache.keys()) {
                if (key.includes(fullPattern)) {
                    keysToDelete.push(key);
                }
            }
            keysToDelete.forEach(key => memoryCache.delete(key));
        }
        catch (error) {
            console.warn('⚠️ Cache CLEAR pattern error:', error);
        }
    }
    /**
     * Check if cache is available
     */
    isAvailable() {
        return true; // Memory cache is always available
    }
    buildKey(key, prefix) {
        const actualPrefix = prefix || this.defaultPrefix;
        return `${actualPrefix}:${key}`;
    }
}
exports.CacheService = CacheService;
// Specialized cache services for different data types
class BitrixCacheService extends CacheService {
    constructor() {
        super(...arguments);
        this.bitrixPrefix = 'bitrix24';
    }
    async getDealCategories() {
        return this.get('deal-categories', {
            prefix: this.bitrixPrefix,
            ttl: 7200, // 2 hours - categories don't change often
        });
    }
    async setDealCategories(categories) {
        return this.set('deal-categories', categories, {
            prefix: this.bitrixPrefix,
            ttl: 7200,
        });
    }
    async getDealStages(categoryId) {
        return this.get(`deal-stages:${categoryId}`, {
            prefix: this.bitrixPrefix,
            ttl: 3600, // 1 hour
        });
    }
    async setDealStages(categoryId, stages) {
        return this.set(`deal-stages:${categoryId}`, stages, {
            prefix: this.bitrixPrefix,
            ttl: 3600,
        });
    }
    async getDynamicOptions(source, filter) {
        const key = filter
            ? `dynamic-options:${source}:${Buffer.from(filter).toString('base64')}`
            : `dynamic-options:${source}:all`;
        return this.get(key, {
            prefix: this.bitrixPrefix,
            ttl: 1800, // 30 minutes - dynamic data changes more frequently
        });
    }
    async setDynamicOptions(source, options, filter) {
        const key = filter
            ? `dynamic-options:${source}:${Buffer.from(filter).toString('base64')}`
            : `dynamic-options:${source}:all`;
        return this.set(key, options, {
            prefix: this.bitrixPrefix,
            ttl: 1800,
        });
    }
    async clearBitrixCache() {
        await this.clearPattern('*', { prefix: this.bitrixPrefix });
    }
}
exports.BitrixCacheService = BitrixCacheService;
class FormCacheService extends CacheService {
    constructor() {
        super(...arguments);
        this.formPrefix = 'forms';
    }
    async getFormWithFields(formId) {
        return this.get(`form-with-fields:${formId}`, {
            prefix: this.formPrefix,
            ttl: 1800, // 30 minutes - forms can be edited
        });
    }
    async setFormWithFields(formId, form) {
        return this.set(`form-with-fields:${formId}`, form, {
            prefix: this.formPrefix,
            ttl: 1800,
        });
    }
    async getActiveFormsList() {
        return this.get('active-forms-list', {
            prefix: this.formPrefix,
            ttl: 600, // 10 minutes - can be edited frequently
        });
    }
    async setActiveFormsList(forms) {
        return this.set('active-forms-list', forms, {
            prefix: this.formPrefix,
            ttl: 600,
        });
    }
    async clearFormCache(formId) {
        if (formId) {
            await this.del(`form-with-fields:${formId}`, { prefix: this.formPrefix });
        }
        else {
            await this.clearPattern('*', { prefix: this.formPrefix });
        }
    }
}
exports.FormCacheService = FormCacheService;
// Export singleton instances
exports.cacheService = new CacheService();
exports.bitrixCache = new BitrixCacheService();
exports.formCache = new FormCacheService();
