"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseService = void 0;
class BaseService {
    constructor(repository) {
        this.repository = repository;
    }
    async findById(id) {
        return this.repository.findById(id);
    }
    async findAll() {
        return this.repository.findAll();
    }
    async findByIds(ids) {
        return this.repository.findByIds(ids);
    }
    async findWithPagination(options) {
        return this.repository.findWithPagination(options);
    }
    async create(data) {
        return this.repository.create(data);
    }
    async update(id, data) {
        return this.repository.update(id, data);
    }
    async delete(id) {
        return this.repository.delete(id);
    }
    async exists(id) {
        return this.repository.existsById(id);
    }
    async count() {
        return this.repository.count();
    }
    async validateUnique(field, value, excludeId) {
        const options = {
            where: { [field]: value }
        };
        const existing = await this.repository.findOne(options);
        if (!existing)
            return true;
        if (excludeId && existing.id === excludeId)
            return true;
        return false;
    }
    throwNotFound(entity, id) {
        throw new Error(`${entity} с ID ${id} не найден`);
    }
    throwValidationError(message) {
        throw new Error(`Ошибка валидации: ${message}`);
    }
    throwDuplicateError(field, value) {
        throw new Error(`${field} "${value}" уже существует`);
    }
}
exports.BaseService = BaseService;
