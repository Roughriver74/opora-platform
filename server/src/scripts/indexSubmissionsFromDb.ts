#!/usr/bin/env ts-node

import { AppDataSource } from '../database/config/database.config'
import { elasticsearchService } from '../services/elasticsearchService'
import { logger } from '../utils/logger'
import { Submission } from '../database/entities/Submission.entity'

/**
 * Скрипт для индексации всех заявок из PostgreSQL в Elasticsearch
 * Используется для восстановления индекса после синхронизации БД
 */
async function indexSubmissionsFromDb() {
	try {
		logger.info('🚀 Начало индексации заявок из PostgreSQL в Elasticsearch')

		// Инициализация подключения к БД
		if (!AppDataSource.isInitialized) {
			await AppDataSource.initialize()
			logger.info('✅ Подключение к БД установлено')
		}

		// Elasticsearch инициализируется автоматически
		logger.info('✅ Elasticsearch готов к работе')

		// Получаем все заявки из БД
		const submissionRepository = AppDataSource.getRepository(Submission)
		const totalCount = await submissionRepository.count()
		logger.info(`📊 Всего заявок в БД: ${totalCount}`)

		// Обрабатываем заявки батчами
		const batchSize = 100
		let indexed = 0
		let failed = 0
		const errors: string[] = []

		for (let offset = 0; offset < totalCount; offset += batchSize) {
			const submissions = await submissionRepository.find({
				skip: offset,
				take: batchSize,
				relations: ['user', 'form'],
			})

			logger.info(
				`📦 Обработка батча ${offset / batchSize + 1}/${Math.ceil(totalCount / batchSize)} (${submissions.length} заявок)`
			)

			for (const submission of submissions) {
				try {
					await elasticsearchService.indexSubmission(submission)
					indexed++

					if (indexed % 100 === 0) {
						logger.info(`✅ Проиндексировано: ${indexed}/${totalCount}`)
					}
				} catch (error: any) {
					failed++
					const errorMsg = `Ошибка индексации заявки ${submission.id}: ${error.message}`
					errors.push(errorMsg)
					logger.error(errorMsg)
				}
			}
		}

		// Обновляем индекс для поиска
		await elasticsearchService.refreshIndex()
		logger.info('🔄 Индекс обновлён')

		// Итоговая статистика
		logger.info('✅ Индексация завершена:', {
			total: totalCount,
			indexed,
			failed,
			errors: errors.slice(0, 10), // Первые 10 ошибок
		})

		// Проверяем результат
		const indexStats = await elasticsearchService.getIndexStats()
		if (indexStats) {
			logger.info('📈 Статистика индекса после индексации:', {
				documents: indexStats.total?.docs?.count || 0,
				size: indexStats.total?.store?.size_in_bytes || 0,
			})
		}

		await AppDataSource.destroy()
		process.exit(0)
	} catch (error) {
		logger.error('❌ Ошибка при индексации:', error)
		process.exit(1)
	}
}

// Запускаем скрипт
if (require.main === module) {
	indexSubmissionsFromDb()
}

export { indexSubmissionsFromDb }
