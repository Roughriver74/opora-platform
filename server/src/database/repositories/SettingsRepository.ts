import { BaseRepository } from './base/BaseRepository'
import { Settings, SettingCategory } from '../entities/Settings.entity'

export class SettingsRepository extends BaseRepository<Settings> {
    constructor(cachePrefix?: string) {
        super(Settings, cachePrefix)
    }
    async findByKey(key: string): Promise<Settings | null> {
        return this.repository.findOne({ where: { key } })
    }

    async findByCategory(category: SettingCategory): Promise<Settings[]> {
        return this.repository.find({ 
            where: { category },
            order: { key: 'ASC' }
        })
    }

    async deleteSetting(key: string): Promise<boolean> {
        const result = await this.repository.delete({ key })
        return result.affected === 1
    }

    async getPublicSettings(): Promise<Settings[]> {
        return this.repository.find({ 
            where: { isPublic: true },
            order: { category: 'ASC', key: 'ASC' }
        })
    }
}