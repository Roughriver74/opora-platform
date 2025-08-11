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
import authRoutes from './routes/authRoutes'
import userRoutes from './routes/userRoutes'
import diagnosticRoutes from './routes/diagnosticRoutes'
import backupRoutes from './routes/backupRoutes'
import settingsRoutes from './routes/settingsRoutes'
import syncRoutes from './routes/syncRoutes'
import { initializeDefaultSettings } from './controllers/settingsController'

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

// Маршруты авторизации (без middleware)
app.use('/api/auth', authRoutes)

// Применяем middleware авторизации для остальных маршрутов
app.use(authMiddleware)

// Остальные маршруты API
app.use('/api/form-fields', formFieldRoutes)
app.use('/api/forms', formRoutes)
app.use('/api/submissions', submissionRoutes)
app.use('/api/submissions', optimizedSubmissionRoutes)
app.use('/api/users', userRoutes)
app.use('/api/diagnostic', diagnosticRoutes)
app.use('/api/backups', backupRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/sync', syncRoutes)

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
