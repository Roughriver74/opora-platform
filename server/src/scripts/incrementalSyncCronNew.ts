#!/usr/bin/env ts-node

/**
 * Новый cron-скрипт для автоматической инкрементальной синхронизации
 * Поддерживает аргументы командной строки для полной синхронизации
 */

import dotenv from 'dotenv'
import { initializeDatabase } from '../database/config/database.config'
import { incrementalSyncService } from '../services/incrementalSyncService'
import { logger } from '../utils/logger'

// Загружаем переменные окружения
dotenv.config()

/**
 * Cron-скрипт для автоматической инкрементальной синхронизации
 * Запускается по расписанию для поддержания актуальности данных
 */
async function incrementalSyncCronNew() {
	const startTime = Date.now()
	let success = true
	const errors: string[] = []

	try {
		logger.info('🕐 Запуск cron-синхронизации Elasticsearch...')

		// Инициализируем базу данных
		await initializeDatabase()
		logger.info('✅ База данных инициализирована')

		// Проверяем аргументы командной строки
		const args = process.argv.slice(2)
		const forceFullSync =
			args.includes('--forceFullSync') || args.includes('--force-full-sync')

		logger.info(
			`📋 Режим синхронизации: ${forceFullSync ? 'Полная' : 'Инкрементальная'}`
		)

		// Выполняем синхронизацию через новый метод
		const results = await incrementalSyncService.syncAllData({
			forceFullSync, // Определяется аргументами командной строки
			batchSize: 200, // Увеличиваем размер пакета для cron
			maxAgeHours: 24,
		})

		// Подсчитываем общую статистику
		const totalProcessed = results.reduce((sum, r) => sum + r.totalProcessed, 0)
		const totalSuccessful = results.reduce((sum, r) => sum + r.successful, 0)
		const totalFailed = results.reduce((sum, r) => sum + r.failed, 0)
		const allErrors = results.flatMap(r => r.errors)

		if (allErrors.length > 0) {
			errors.push(...allErrors)
			success = false
		}

		const duration = Date.now() - startTime
		logger.info(`✅ Cron-синхронизация завершена за ${duration}ms`)
		logger.info(
			`📊 Результат: ${totalSuccessful}/${totalProcessed} записей успешно обработано`
		)

		if (totalFailed > 0) {
			logger.warn(`⚠️ ${totalFailed} записей не удалось обработать`)
		}

		if (allErrors.length > 0) {
			logger.warn(`⚠️ Ошибки: ${allErrors.join('; ')}`)
		}
	} catch (error: any) {
		logger.error('❌ Критическая ошибка при выполнении cron-скрипта:', error)
		errors.push(error.message)
		success = false
	}

	// Завершаем процесс с соответствующим кодом
	if (success) {
		logger.info('🎉 Cron-синхронизация завершена успешно')
		process.exit(0)
	} else {
		logger.error('❌ Cron-синхронизация завершена с ошибками')
		process.exit(1)
	}
}

// Запускаем cron-скрипт если он вызван напрямую
if (require.main === module) {
	incrementalSyncCronNew()
		.then(() => {
			logger.info('🎉 Cron-скрипт завершен успешно')
			process.exit(0)
		})
		.catch(error => {
			logger.error('❌ Cron-скрипт завершен с ошибкой:', error)
			process.exit(1)
		})
}

export { incrementalSyncCronNew }

