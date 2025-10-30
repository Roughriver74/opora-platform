import 'reflect-metadata'
import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import {
	initializeDatabase,
	closeDatabaseConnection,
} from './database/config/database.config'
import redisClient from './config/redis'
import config from './config/config'
import { authMiddleware } from './middleware/authMiddleware'
import dotenv from 'dotenv'

// Импорт маршрутизаторов
import formFieldRoutes from './routes/formFieldRoutes'
import formRoutes from './routes/formRoutes'
import submissionRoutes from './routes/submissionRoutes'
import optimizedSubmissionRoutes from './routes/optimizedSubmissionRoutes'
import periodSubmissionRoutes from './routes/periodSubmissionRoutes'
import authRoutes from './routes/authRoutes'
import userRoutes from './routes/userRoutes'
import diagnosticRoutes from './routes/diagnosticRoutes'
import backupRoutes from './routes/backupRoutes'
import settingsRoutes from './routes/settingsRoutes'
import syncRoutes from './routes/syncRoutes'
import searchRoutes from './routes/searchRoutes'
import incrementalSyncRoutes from './routes/incrementalSyncRoutes'
import cronRoutes from './routes/cronRoutes'
import { initializeDefaultSettings } from './controllers/settingsController'
import { initializeElasticsearch } from './scripts/initializeElasticsearch'
import { syncScheduler } from './services/syncScheduler'

// Загрузка переменных окружения
dotenv.config()

// Инициализация Express приложения
const app = express()

// Подключение к PostgreSQL и инициализация
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
		console.log('🕐 Инициализация планировщика синхронизации...')
		// Планировщик автоматически запускается в конструкторе
		console.log('✅ Планировщик синхронизации инициализирован')

		// Инициализация воркера очереди заявок
		const { getSubmissionQueueWorker } = require('./queue/SubmissionQueueWorker')
		const submissionWorker = getSubmissionQueueWorker(5) // 5 параллельных задач
		await submissionWorker.start()
		console.log('✅ Воркер очереди заявок запущен')

		// Инициализация планировщика запланированных заявок
		const { getSubmissionSchedulerService } = require('./services/SubmissionSchedulerService')
		const submissionScheduler = getSubmissionSchedulerService()
		submissionScheduler.start('*/30 * * * *') // Каждые 30 минут
		console.log('✅ Планировщик запланированных заявок запущен')
	} catch (error) {
		console.error('❌ Ошибка инициализации сервера:', error)
		process.exit(1)
	}
}

// Запуск инициализации
initializeServer()

// Middleware
// Настройка CORS (разрешаем все origin; модуль выставит конкретный Origin)
app.use(
	cors({
		origin: true,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
		allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
		credentials: true,
		optionsSuccessStatus: 200,
	})
)

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// Увеличиваем timeout для Express (5 минут)
app.use((req, res, next) => {
	req.setTimeout(300000) // 5 минут
	res.setTimeout(300000) // 5 минут
	next()
})

// Маршруты авторизации (без middleware)
app.use('/api/auth', authRoutes)

// Простой endpoint для инкрементальной синхронизации без аутентификации
app.post('/sync-data', async (req, res) => {
	try {
		const {
			incrementalSyncService,
		} = require('./services/incrementalSyncService')
		console.log('🚀 Запуск инкрементальной синхронизации данных...')

		const results = await incrementalSyncService.syncAllData({
			forceFullSync: false,
			batchSize: 100,
			maxAgeHours: 24,
		})

		const totalProcessed = results.reduce((sum, r) => sum + r.totalProcessed, 0)
		const totalSuccessful = results.reduce((sum, r) => sum + r.successful, 0)

		console.log(
			`✅ Инкрементальная синхронизация завершена: ${totalSuccessful}/${totalProcessed} записей успешно обработано`
		)

		res.json({
			success: true,
			message: 'Инкрементальная синхронизация завершена',
			data: {
				results,
				summary: {
					totalProcessed,
					totalSuccessful,
				},
			},
		})
	} catch (error) {
		console.error('❌ Ошибка при инкрементальной синхронизации:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка при инкрементальной синхронизации',
			error: error.message,
		})
	}
})

// Временно убираем аутентификацию для запуска инкрементальной синхронизации
app.post('/api/sync/start', async (req, res) => {
	try {
		const {
			incrementalSyncService,
		} = require('./services/incrementalSyncService')
		console.log('🚀 Запуск инкрементальной синхронизации данных...')

		const results = await incrementalSyncService.syncAllData({
			forceFullSync: true, // Принудительная полная синхронизация
			batchSize: 100,
			maxAgeHours: 24,
		})

		const totalProcessed = results.reduce((sum, r) => sum + r.totalProcessed, 0)
		const totalSuccessful = results.reduce((sum, r) => sum + r.successful, 0)

		console.log(
			`✅ Инкрементальная синхронизация завершена: ${totalSuccessful}/${totalProcessed} записей успешно обработано`
		)

		res.json({
			success: true,
			message: 'Инкрементальная синхронизация завершена',
			data: {
				results,
				summary: {
					totalProcessed,
					totalSuccessful,
				},
			},
		})
	} catch (error) {
		console.error('❌ Ошибка при инкрементальной синхронизации:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка при инкрементальной синхронизации',
			error: error.message,
		})
	}
})

// Простые endpoints для синхронизации без аутентификации
app.get('/sync-status', async (req, res) => {
	try {
		const { elasticsearchService } = require('./services/elasticsearchService')
		const stats = await elasticsearchService.getIndexStats()

		res.json({
			success: true,
			data: {
				syncStatus: {
					isRunning: false,
					lastSync: null,
					nextSync: null,
					progress: 0,
					status: 'idle',
					failedRecords: 0,
				},
				indexStats: stats,
				availableSchedules: {
					'Каждые 6 часов': '0 */6 * * *',
					'Каждые 12 часов': '0 */12 * * *',
					Ежедневно: '0 0 * * *',
				},
			},
		})
	} catch (error) {
		res.status(500).json({
			success: false,
			message: 'Ошибка при получении статуса',
			error: error.message,
		})
	}
})

app.get('/sync-stats', async (req, res) => {
	try {
		const { elasticsearchService } = require('./services/elasticsearchService')
		const stats = await elasticsearchService.getIndexStats()

		res.json({
			success: true,
			data: stats,
		})
	} catch (error) {
		res.status(500).json({
			success: false,
			message: 'Ошибка при получении статистики',
			error: error.message,
		})
	}
})

// Маршруты синхронизации без аутентификации
app.use('/api/sync', syncRoutes)

// Маршруты инкрементальной синхронизации без аутентификации (для тестирования)
app.use('/api/incremental-sync', incrementalSyncRoutes)

// Маршруты управления cron-задачами
app.use('/api/cron', cronRoutes)

// Применяем middleware авторизации для остальных маршрутов
app.use(authMiddleware)

// Остальные маршруты API
app.use('/api/form-fields', formFieldRoutes)
app.use('/api/forms', formRoutes)
app.use('/api/submissions/period', periodSubmissionRoutes)
app.use('/api/submissions', submissionRoutes)
app.use('/api/submissions', optimizedSubmissionRoutes)
app.use('/api/users', userRoutes)
app.use('/api/diagnostic', diagnosticRoutes)
app.use('/api/backups', backupRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/search', searchRoutes)

// Базовый маршрут для проверки работоспособности API
app.get('/', (req, res) => {
	res.json({
		message: 'Beton CRM API работает',
		database: 'PostgreSQL',
		version: '2.0.0',
	})
})

// Health check endpoint
app.get('/health', async (req, res) => {
	try {
		// Проверка подключения к БД
		const dbConnected = await checkDatabaseConnection()

		res.json({
			status: 'ok',
			database: dbConnected ? 'connected' : 'disconnected',
			uptime: process.uptime(),
			timestamp: new Date().toISOString(),
		})
	} catch (error: any) {
		res.status(503).json({
			status: 'error',
			error: error.message,
		})
	}
})

// Алиас для health под /api/health, чтобы скрипты деплоя и внешние проверки
// использовали единый путь
app.get('/api/health', async (req, res) => {
	try {
		const dbConnected = await checkDatabaseConnection()
		res.json({
			status: 'ok',
			database: dbConnected ? 'connected' : 'disconnected',
			uptime: process.uptime(),
			timestamp: new Date().toISOString(),
		})
	} catch (error: any) {
		res.status(503).json({ status: 'error', error: error.message })
	}
})

// Функция проверки подключения к БД
async function checkDatabaseConnection(): Promise<boolean> {
	try {
		const { AppDataSource } = await import('./database/config/database.config')
		return AppDataSource.isInitialized
	} catch {
		return false
	}
}

// Запуск сервера
const PORT = process.env.PORT || 5000
const server = app.listen(PORT, () => {})

// Graceful shutdown
process.on('SIGTERM', async () => {
	server.close(async () => {
		// Остановка воркера и планировщика
		try {
			const { getSubmissionQueueWorker } = require('./queue/SubmissionQueueWorker')
			const submissionWorker = getSubmissionQueueWorker()
			await submissionWorker.close()
			console.log('✅ Воркер очереди заявок остановлен')
		} catch (error) {
			console.error('Ошибка остановки воркера:', error)
		}

		try {
			const { getSubmissionSchedulerService } = require('./services/SubmissionSchedulerService')
			const submissionScheduler = getSubmissionSchedulerService()
			submissionScheduler.stop()
			console.log('✅ Планировщик заявок остановлен')
		} catch (error) {
			console.error('Ошибка остановки планировщика:', error)
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

// Обработка необработанных ошибок
process.on('unhandledRejection', (error: any) => {
	console.error('Необработанная ошибка:', error)
	// В production можно отправлять в систему мониторинга
})

process.on('uncaughtException', (error: Error) => {
	console.error('Необработанное исключение:', error)
	// Критическая ошибка - перезапускаем процесс
	process.exit(1)
})

export default app
