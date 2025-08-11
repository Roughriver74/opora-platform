"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsRepository = void 0;
const BaseRepository_1 = require("./base/BaseRepository");
const Settings_entity_1 = require("../entities/Settings.entity");
class SettingsRepository extends BaseRepository_1.BaseRepository {
    constructor(cachePrefix) {
        super(Settings_entity_1.Settings, cachePrefix);
    }
    async findByKey(key) {
        return this.repository.findOne({ where: { key } });
    }
    async findByCategory(category) {
        return this.repository.find({
            where: { category },
            order: { key: 'ASC' }
        });
    }
    async deleteSetting(key) {
        const result = await this.repository.delete({ key });
        return result.affected === 1;
    }
    async getPublicSettings() {
        return this.repository.find({
            where: { isPublic: true },
            order: { category: 'ASC', key: 'ASC' }
        });
    }
}
exports.SettingsRepository = SettingsRepository;
