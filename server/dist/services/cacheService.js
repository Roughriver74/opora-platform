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
    get(key, options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const fullKey = this.buildKey(key, options === null || options === void 0 ? void 0 : options.prefix);
                const cached = memoryCache.get(fullKey);
                if (cached && cached.expires > Date.now()) {
                    console.log(`📦 Memory Cache HIT: ${fullKey}`);
                    return cached.data;
                }
                // Удаляем устаревший кэш
                if (cached && cached.expires <= Date.now()) {
                    memoryCache.delete(fullKey);
                }
                console.log(`❌ Memory Cache MISS: ${fullKey}`);
                return null;
            }
            catch (error) {
                console.warn('⚠️ Cache GET error:', error);
                return null;
            }
        });
    }
    /**
     * Set data in cache
     */
    set(key, data, options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const fullKey = this.buildKey(key, options === null || options === void 0 ? void 0 : options.prefix);
                const ttl = (options === null || options === void 0 ? void 0 : options.ttl) || this.defaultTTL;
                const expires = Date.now() + (ttl * 1000);
                memoryCache.set(fullKey, { data, expires });
                console.log(`💾 Memory Cache SET: ${fullKey} (TTL: ${ttl}s)`);
                return true;
            }
            catch (error) {
                console.warn('⚠️ Cache SET error:', error);
                return false;
            }
        });
    }
    /**
     * Delete cached data
     */
    del(key, options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const fullKey = this.buildKey(key, options === null || options === void 0 ? void 0 : options.prefix);
                const success = memoryCache.delete(fullKey);
                if (success) {
                    console.log(`🗑️ Memory Cache DEL: ${fullKey}`);
                }
                return success;
            }
            catch (error) {
                console.warn('⚠️ Cache DEL error:', error);
                return false;
            }
        });
    }
    /**
     * Get or set pattern - tries to get, if not found executes setter and caches result
     */
    getOrSet(key, setter, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const cached = yield this.get(key, options);
            if (cached !== null) {
                return cached;
            }
            try {
                const data = yield setter();
                yield this.set(key, data, options);
                return data;
            }
            catch (error) {
                console.warn('⚠️ Cache getOrSet setter error:', error);
                return null;
            }
        });
    }
    /**
     * Clear all cache entries with pattern
     */
    clearPattern(pattern, options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const fullPattern = this.buildKey(pattern, options === null || options === void 0 ? void 0 : options.prefix);
                const keysToDelete = [];
                for (const key of memoryCache.keys()) {
                    if (key.includes(fullPattern)) {
                        keysToDelete.push(key);
                    }
                }
                keysToDelete.forEach(key => memoryCache.delete(key));
                console.log(`🧹 Memory Cache CLEAR pattern: ${fullPattern} (${keysToDelete.length} keys)`);
            }
            catch (error) {
                console.warn('⚠️ Cache CLEAR pattern error:', error);
            }
        });
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
    getDealCategories() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.get('deal-categories', {
                prefix: this.bitrixPrefix,
                ttl: 7200, // 2 hours - categories don't change often
            });
        });
    }
    setDealCategories(categories) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.set('deal-categories', categories, {
                prefix: this.bitrixPrefix,
                ttl: 7200,
            });
        });
    }
    getDealStages(categoryId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.get(`deal-stages:${categoryId}`, {
                prefix: this.bitrixPrefix,
                ttl: 3600, // 1 hour
            });
        });
    }
    setDealStages(categoryId, stages) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.set(`deal-stages:${categoryId}`, stages, {
                prefix: this.bitrixPrefix,
                ttl: 3600,
            });
        });
    }
    getDynamicOptions(source, filter) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = filter
                ? `dynamic-options:${source}:${Buffer.from(filter).toString('base64')}`
                : `dynamic-options:${source}:all`;
            return this.get(key, {
                prefix: this.bitrixPrefix,
                ttl: 1800, // 30 minutes - dynamic data changes more frequently
            });
        });
    }
    setDynamicOptions(source, options, filter) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = filter
                ? `dynamic-options:${source}:${Buffer.from(filter).toString('base64')}`
                : `dynamic-options:${source}:all`;
            return this.set(key, options, {
                prefix: this.bitrixPrefix,
                ttl: 1800,
            });
        });
    }
    clearBitrixCache() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.clearPattern('*', { prefix: this.bitrixPrefix });
        });
    }
}
exports.BitrixCacheService = BitrixCacheService;
class FormCacheService extends CacheService {
    constructor() {
        super(...arguments);
        this.formPrefix = 'forms';
    }
    getFormWithFields(formId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.get(`form-with-fields:${formId}`, {
                prefix: this.formPrefix,
                ttl: 1800, // 30 minutes - forms can be edited
            });
        });
    }
    setFormWithFields(formId, form) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.set(`form-with-fields:${formId}`, form, {
                prefix: this.formPrefix,
                ttl: 1800,
            });
        });
    }
    getActiveFormsList() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.get('active-forms-list', {
                prefix: this.formPrefix,
                ttl: 600, // 10 minutes - can be edited frequently
            });
        });
    }
    setActiveFormsList(forms) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.set('active-forms-list', forms, {
                prefix: this.formPrefix,
                ttl: 600,
            });
        });
    }
    clearFormCache(formId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (formId) {
                yield this.del(`form-with-fields:${formId}`, { prefix: this.formPrefix });
            }
            else {
                yield this.clearPattern('*', { prefix: this.formPrefix });
            }
        });
    }
}
exports.FormCacheService = FormCacheService;
// Export singleton instances
exports.cacheService = new CacheService();
exports.bitrixCache = new BitrixCacheService();
exports.formCache = new FormCacheService();
