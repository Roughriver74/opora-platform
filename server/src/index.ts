import 'reflect-metadata'
import dotenv from 'dotenv'
import { initializeDatabase, closeDatabaseConnection } from './database/config/database.config'
import redisClient from './config/redis'
import { initializeDefaultSettings } from './controllers/settingsController'
import { initializeElasticsearch } from './scripts/initializeElasticsearch'
import { getSubmissionQueueWorker } from './queue/SubmissionQueueWorker'
import { getSubmissionSchedulerService } from './services/SubmissionSchedulerService'
import app from './app'
import { logger } from './utils/logger'

// Загрузка переменных окружения
dotenv.config()

const initializeServer = async () => {
	try {
		// Инициализация PostgreSQL
		await initializeDatabase()

		// Redis временно отключен для стабильной работы
		// await redisClient.connect()

		// Инициализация настроек
		await initializeDefaultSettings()

		// Инициализация Elasticsearch
		await initializeElasticsearch()

		// Инициализация планировщика синхронизации
		logger.info('🕐 Инициализация планировщика синхронизации...')
		// Планировщик автоматически запускается в конструкторе
		logger.info('✅ Планировщик синхронизации инициализирован')

		// Инициализация воркера очереди заявок
		const submissionWorker = getSubmissionQueueWorker(5) // 5 параллельных задач
		await submissionWorker.start()
		logger.info('✅ Воркер очереди заявок запущен')

		// Инициализация планировщика запланированных заявок
		const submissionScheduler = getSubmissionSchedulerService()
		submissionScheduler.start('*/30 * * * *') // Каждые 30 минут
		logger.info('✅ Планировщик запланированных заявок запущен')

		// Запуск сервера
		const PORT = process.env.PORT || 5000
		const server = app.listen(PORT, () => {
			logger.info(`🚀 Сервер запущен на порту ${PORT}`)
		})

		// Graceful shutdown
		process.on('SIGTERM', async () => {
			server.close(async () => {
				// Остановка воркера и планировщика
				try {
					const submissionWorker = getSubmissionQueueWorker()
					await submissionWorker.close()
					logger.info('✅ Воркер очереди заявок остановлен')
				} catch (error) {
					logger.error('Ошибка остановки воркера:', error)
				}

				try {
					const submissionScheduler = getSubmissionSchedulerService()
					submissionScheduler.stop()
					logger.info('✅ Планировщик заявок остановлен')
				} catch (error) {
					logger.error('Ошибка остановки планировщика:', error)
				}

				// Закрытие подключения к БД
				await closeDatabaseConnection()

				// Закрытие Redis если подключен
				if (redisClient && redisClient.isConnected()) {
					await redisClient.disconnect()
				}

				process.exit(0)
			})
		})

	} catch (error) {
		logger.error('❌ Ошибка инициализации сервера:', error)
		process.exit(1)
	}
}

// Запуск инициализации
initializeServer()

// Обработка необработанных ошибок
process.on('unhandledRejection', (error: any) => {
	logger.error('Необработанная ошибка:', error)
})

process.on('uncaughtException', (error: Error) => {
	logger.error('Необработанное исключение:', error)
	process.exit(1)
})

