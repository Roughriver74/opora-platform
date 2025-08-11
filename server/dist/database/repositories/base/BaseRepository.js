"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = void 0;
const database_config_1 = require("../../config/database.config");
const redis_1 = require("redis");
class BaseRepository {
    constructor(EntityClass, cachePrefix) {
        this.EntityClass = EntityClass;
        this.redisClient = null;
        this.cacheTTL = 3600; // 1 час по умолчанию
        this.repository = database_config_1.AppDataSource.getRepository(EntityClass);
        this.cachePrefix = cachePrefix || EntityClass.name.toLowerCase();
        this.initRedis();
    }
    async initRedis() {
        try {
            this.redisClient = (0, redis_1.createClient)({
                url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
            });
            await this.redisClient.connect();
        }
        catch (error) {
            console.error('Ошибка подключения к Redis:', error);
            this.redisClient = null;
        }
    }
    async findById(id, options) {
        const cacheKey = `${this.cachePrefix}:${id}`;
        // Попытка получить из кеша
        if (this.redisClient) {
            try {
                const cached = await this.redisClient.get(cacheKey);
                if (cached) {
                    return JSON.parse(cached);
                }
            }
            catch (error) {
                console.error('Ошибка чтения из кеша:', error);
            }
        }
        const entity = await this.repository.findOne({
            where: { id },
            ...options,
        });
        // Сохранение в кеш
        if (entity && this.redisClient) {
            try {
                await this.redisClient.setEx(cacheKey, this.cacheTTL, JSON.stringify(entity));
            }
            catch (error) {
                console.error('Ошибка записи в кеш:', error);
            }
        }
        return entity;
    }
    async findAll(options) {
        return this.repository.find(options);
    }
    async findByIds(ids) {
        if (ids.length === 0)
            return [];
        const queryBuilder = this.repository.createQueryBuilder('entity');
        return queryBuilder
            .where('entity.id IN (:...ids)', { ids })
            .getMany();
    }
    async findOne(options) {
        return this.repository.findOne(options);
    }
    async findWithPagination(options) {
        const page = Math.max(1, options.page || 1);
        const limit = Math.min(100, Math.max(1, options.limit || 20));
        const skip = (page - 1) * limit;
        const { sortBy, sortOrder, ...findOptions } = options;
        const queryOptions = {
            ...findOptions,
            skip,
            take: limit,
        };
        if (sortBy) {
            queryOptions.order = {
                [sortBy]: sortOrder || 'ASC',
            };
        }
        const [data, total] = await this.repository.findAndCount(queryOptions);
        const totalPages = Math.ceil(total / limit);
        return {
            data,
            total,
            page,
            limit,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        };
    }
    async create(data) {
        const entity = this.repository.create(data);
        const saved = await this.repository.save(entity);
        await this.invalidateCache(saved.id);
        return saved;
    }
    async update(id, data) {
        const entity = await this.findById(id);
        if (!entity)
            return null;
        const updated = this.repository.merge(entity, data);
        const saved = await this.repository.save(updated);
        await this.invalidateCache(id);
        return saved;
    }
    async delete(id) {
        const result = await this.repository.delete(id);
        await this.invalidateCache(id);
        return result.affected ? result.affected > 0 : false;
    }
    async softDelete(id) {
        const result = await this.repository.softDelete(id);
        await this.invalidateCache(id);
        return result.affected ? result.affected > 0 : false;
    }
    async restore(id) {
        const result = await this.repository.restore(id);
        await this.invalidateCache(id);
        return result.affected ? result.affected > 0 : false;
    }
    async count(options) {
        return this.repository.count(options);
    }
    async exists(options) {
        const count = await this.count(options);
        return count > 0;
    }
    async existsById(id) {
        return this.exists({ where: { id } });
    }
    async bulkCreate(data) {
        const entities = this.repository.create(data);
        const saved = await this.repository.save(entities);
        // Инвалидация кеша для всех созданных сущностей
        for (const entity of saved) {
            await this.invalidateCache(entity.id);
        }
        return saved;
    }
    async bulkUpdate(criteria, data) {
        const result = await this.repository.update(criteria, data);
        await this.invalidateCachePattern(`${this.cachePrefix}:*`);
        return result.affected || 0;
    }
    async bulkDelete(ids) {
        if (ids.length === 0)
            return 0;
        const result = await this.repository.delete(ids);
        // Инвалидация кеша для всех удаленных сущностей
        for (const id of ids) {
            await this.invalidateCache(id);
        }
        return result.affected || 0;
    }
    createQueryBuilder(alias) {
        return this.repository.createQueryBuilder(alias || 'entity');
    }
    async executeRawQuery(query, parameters) {
        return this.repository.query(query, parameters);
    }
    async invalidateCache(id) {
        if (!this.redisClient)
            return;
        try {
            await this.redisClient.del(`${this.cachePrefix}:${id}`);
        }
        catch (error) {
            console.error('Ошибка инвалидации кеша:', error);
        }
    }
    async invalidateCachePattern(pattern) {
        if (!this.redisClient)
            return;
        try {
            const keys = await this.redisClient.keys(pattern);
            if (keys.length > 0) {
                await this.redisClient.del(keys);
            }
        }
        catch (error) {
            console.error('Ошибка инвалидации кеша по паттерну:', error);
        }
    }
    async cacheGet(key) {
        if (!this.redisClient)
            return null;
        try {
            const cached = await this.redisClient.get(key);
            return cached ? JSON.parse(cached) : null;
        }
        catch (error) {
            console.error('Ошибка чтения из кеша:', error);
            return null;
        }
    }
    async cacheSet(key, value, ttl = this.cacheTTL) {
        if (!this.redisClient)
            return;
        try {
            await this.redisClient.setEx(key, ttl, JSON.stringify(value));
        }
        catch (error) {
            console.error('Ошибка записи в кеш:', error);
        }
    }
    async disconnect() {
        if (this.redisClient) {
            await this.redisClient.quit();
        }
    }
}
exports.BaseRepository = BaseRepository;
