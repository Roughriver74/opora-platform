#!/usr/bin/env ts-node

import { incrementalSyncService } from '../services/incrementalSyncService'
import { syncMetadataService } from '../services/syncMetadataService'
import { elasticsearchService } from '../services/elasticsearchService'
import { logger } from '../utils/logger'
import { AppDataSource } from '../database/config/database.config'
import dotenv from 'dotenv'

// Загружаем переменные окружения
dotenv.config()

/**
 * Cron-скрипт для автоматической инкрементальной синхронизации
 * Запускается по расписанию для поддержания актуальности данных
 */
async function incrementalSyncCron() {
	const startTime = Date.now()
	let success = true
	const errors: string[] = []

	try {
		logger.info('🕐 Запуск cron-синхронизации Elasticsearch...')

		// Инициализируем базу данных
		if (!AppDataSource.isInitialized) {
			await AppDataSource.initialize()
			logger.info('✅ База данных инициализирована')
		}

		// Проверяем здоровье Elasticsearch
		const isHealthy = await elasticsearchService.healthCheck()
		if (!isHealthy) {
			throw new Error('Elasticsearch недоступен')
		}

		// Инициализируем алиас если нужно
		try {
			await elasticsearchService.initializeAlias()
		} catch (error) {
			logger.warn('Предупреждение при инициализации алиаса:', error.message)
		}

		// Получаем текущий статус всех синхронизаций
		const allMetadata = await syncMetadataService.getAllMetadata()
		logger.info(
			`📊 Найдено ${allMetadata.length} типов данных для синхронизации`
		)

		// Определяем стратегию синхронизации для каждого типа
		const syncTasks: Array<{
			type: string
			needsFullSync: boolean
			lastSyncTime: Date | null
		}> = []

		for (const metadata of allMetadata) {
			const needsFullSync = await syncMetadataService.needsFullSync(
				metadata.entityType,
				24 // 24 часа для полной синхронизации
			)

			syncTasks.push({
				type: metadata.entityType,
				needsFullSync,
				lastSyncTime: metadata.lastSyncTime,
			})

			logger.info(
				`📋 ${metadata.entityType}: ${
					needsFullSync ? 'полная' : 'инкрементальная'
				} синхронизация (последняя: ${
					metadata.lastSyncTime?.toISOString() || 'никогда'
				})`
			)
		}

		// Выполняем синхронизацию по типам
		const results: any[] = []

		// 1. Синхронизация продуктов
		try {
			logger.info('📦 Синхронизация продуктов...')
			const productTask = syncTasks.find(t => t.type === 'products')
			const productResult = await incrementalSyncService.syncProducts({
				forceFullSync: productTask?.needsFullSync || false,
				batchSize: 200, // Увеличиваем размер пакета для cron
				maxAgeHours: 24,
			})
			results.push(productResult)
			logger.info(
				`✅ Продукты: ${productResult.successful}/${productResult.totalProcessed}`
			)
		} catch (error) {
			logger.error('❌ Ошибка синхронизации продуктов:', error)
			errors.push(`Products: ${error.message}`)
			success = false
		}

		// 2. Синхронизация компаний
		try {
			logger.info('🏢 Синхронизация компаний...')
			const companyTask = syncTasks.find(t => t.type === 'companies')
			const companyResult = await incrementalSyncService.syncCompanies({
				forceFullSync: companyTask?.needsFullSync || false,
				batchSize: 200,
				maxAgeHours: 24,
			})
			results.push(companyResult)
			logger.info(
				`✅ Компании: ${companyResult.successful}/${companyResult.totalProcessed}`
			)
		} catch (error) {
			logger.error('❌ Ошибка синхронизации компаний:', error)
			errors.push(`Companies: ${error.message}`)
			success = false
		}

		// 3. Синхронизация заявок
		try {
			logger.info('📋 Синхронизация заявок...')
			const submissionTask = syncTasks.find(t => t.type === 'submissions')
			const submissionResult = await incrementalSyncService.syncSubmissions({
				forceFullSync: submissionTask?.needsFullSync || false,
				batchSize: 200,
				maxAgeHours: 24,
			})
			results.push(submissionResult)
			logger.info(
				`✅ Заявки: ${submissionResult.successful}/${submissionResult.totalProcessed}`
			)
		} catch (error) {
			logger.error('❌ Ошибка синхронизации заявок:', error)
			errors.push(`Submissions: ${error.message}`)
			success = false
		}

		// Обновляем индекс для поиска
		try {
			await elasticsearchService.refreshIndex()
			logger.info('✅ Индекс обновлен для поиска')
		} catch (error) {
			logger.warn('Предупреждение при обновлении индекса:', error.message)
		}

		// Получаем финальную статистику
		const finalStats = await elasticsearchService.getIndexStats()
		const totalDocs = finalStats?.total?.docs?.count || 0
		const indexSize = finalStats?.total?.store?.size_in_bytes || 0

		const duration = Date.now() - startTime

		// Логируем итоговую статистику
		logger.info('📊 Итоговая статистика cron-синхронизации:', {
			duration: `${duration}ms`,
			totalDocuments: totalDocs,
			indexSizeBytes: indexSize,
			indexSizeMB: Math.round(indexSize / 1024 / 1024),
			success,
			errors: errors.length > 0 ? errors : undefined,
			results: results.map(r => ({
				type: r.entityType,
				processed: r.totalProcessed,
				successful: r.successful,
				failed: r.failed,
				isFullSync: r.isFullSync,
				duration: r.duration,
			})),
		})

		if (success) {
			logger.info(`🎉 Cron-синхронизация завершена успешно за ${duration}ms`)
		} else {
			logger.warn(`⚠️ Cron-синхронизация завершена с ошибками за ${duration}ms`)
		}

		// Возвращаем код выхода
		process.exit(success ? 0 : 1)
	} catch (error) {
		const duration = Date.now() - startTime
		logger.error(
			`❌ Критическая ошибка cron-синхронизации за ${duration}ms:`,
			error
		)
		process.exit(1)
	}
}

// Обработка сигналов для graceful shutdown
process.on('SIGINT', () => {
	logger.info('🛑 Получен сигнал SIGINT, завершаем cron-синхронизацию...')
	process.exit(0)
})

process.on('SIGTERM', () => {
	logger.info('🛑 Получен сигнал SIGTERM, завершаем cron-синхронизацию...')
	process.exit(0)
})

// Запускаем скрипт
if (require.main === module) {
	incrementalSyncCron()
}

export { incrementalSyncCron }

