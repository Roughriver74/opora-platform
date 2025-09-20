import { AppDataSource } from '../database/config/database.config'
import { SyncMetadata } from '../database/entities/SyncMetadata.entity'
import { logger } from '../utils/logger'

export interface SyncMetadataData {
	entityType: string
	lastSyncTime?: Date
	lastFullSyncTime?: Date
	totalProcessed?: number
	successful?: number
	failed?: number
	errors?: string[]
	status?: 'idle' | 'running' | 'completed' | 'failed'
}

class SyncMetadataService {
	private repository = AppDataSource.getRepository(SyncMetadata)

	/**
	 * Получить метаданные синхронизации для типа сущности
	 */
	async getMetadata(entityType: string): Promise<SyncMetadata | null> {
		try {
			return await this.repository.findOne({
				where: { entityType },
			})
		} catch (error) {
			logger.error(`Failed to get metadata for ${entityType}:`, error)
			return null
		}
	}

	/**
	 * Создать или обновить метаданные синхронизации
	 */
	async upsertMetadata(data: SyncMetadataData): Promise<SyncMetadata> {
		try {
			const existing = await this.getMetadata(data.entityType)

			if (existing) {
				// Обновляем существующие метаданные
				Object.assign(existing, data)
				existing.updatedAt = new Date()
				return await this.repository.save(existing)
			} else {
				// Создаем новые метаданные
				const metadata = this.repository.create({
					entityType: data.entityType,
					lastSyncTime: data.lastSyncTime || null,
					lastFullSyncTime: data.lastFullSyncTime || null,
					totalProcessed: data.totalProcessed || 0,
					successful: data.successful || 0,
					failed: data.failed || 0,
					errors: data.errors || [],
					status: data.status || 'idle',
				})
				return await this.repository.save(metadata)
			}
		} catch (error) {
			logger.error(`Failed to upsert metadata for ${data.entityType}:`, error)
			throw error
		}
	}

	/**
	 * Обновить статус синхронизации
	 */
	async updateStatus(
		entityType: string,
		status: 'idle' | 'running' | 'completed' | 'failed',
		errorMessage?: string
	): Promise<void> {
		try {
			await this.repository.update(
				{ entityType },
				{
					status,
					errors: errorMessage ? [errorMessage] : [],
					updatedAt: new Date(),
				}
			)
		} catch (error) {
			logger.error(`Failed to update status for ${entityType}:`, error)
			throw error
		}
	}

	/**
	 * Обновить время последней синхронизации
	 */
	async updateLastSyncTime(entityType: string, syncTime: Date): Promise<void> {
		try {
			await this.repository.update(
				{ entityType },
				{
					lastSyncTime: syncTime,
					updatedAt: new Date(),
				}
			)
		} catch (error) {
			logger.error(`Failed to update last sync time for ${entityType}:`, error)
			throw error
		}
	}

	/**
	 * Обновить статистику синхронизации
	 */
	async updateStats(
		entityType: string,
		totalProcessed: number,
		successful: number,
		failed: number
	): Promise<void> {
		try {
			await this.repository.update(
				{ entityType },
				{
					totalProcessed,
					successful,
					failed,
					updatedAt: new Date(),
				}
			)
		} catch (error) {
			logger.error(`Failed to update stats for ${entityType}:`, error)
			throw error
		}
	}

	/**
	 * Получить все метаданные синхронизации
	 */
	async getAllMetadata(): Promise<SyncMetadata[]> {
		try {
			return await this.repository.find({
				order: { updatedAt: 'DESC' },
			})
		} catch (error) {
			logger.error('Failed to get all metadata:', error)
			return []
		}
	}

	/**
	 * Очистить метаданные для типа сущности
	 */
	async clearMetadata(entityType: string): Promise<void> {
		try {
			await this.repository.delete({ entityType })
			logger.info(`Cleared metadata for ${entityType}`)
		} catch (error) {
			logger.error(`Failed to clear metadata for ${entityType}:`, error)
			throw error
		}
	}

	/**
	 * Получить время последней полной синхронизации
	 */
	async getLastFullSyncTime(entityType: string): Promise<Date | null> {
		try {
			const metadata = await this.getMetadata(entityType)
			return metadata?.lastFullSyncTime || null
		} catch (error) {
			logger.error(
				`Failed to get last full sync time for ${entityType}:`,
				error
			)
			return null
		}
	}

	/**
	 * Проверить, нужна ли полная синхронизация
	 */
	async needsFullSync(
		entityType: string,
		maxAgeHours: number = 24
	): Promise<boolean> {
		try {
			const metadata = await this.getMetadata(entityType)

			if (!metadata || !metadata.lastFullSyncTime) {
				return true
			}

			const now = new Date()
			const lastFullSync = metadata.lastFullSyncTime
			const hoursSinceLastSync =
				(now.getTime() - lastFullSync.getTime()) / (1000 * 60 * 60)

			return hoursSinceLastSync >= maxAgeHours
		} catch (error) {
			logger.error(
				`Failed to check if full sync needed for ${entityType}:`,
				error
			)
			return true // В случае ошибки делаем полную синхронизацию
		}
	}
}

export const syncMetadataService = new SyncMetadataService()
