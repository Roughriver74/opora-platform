import express from 'express'
import { adminMiddleware } from '../middleware/adminMiddleware'
import { AppDataSource } from '../database/config/database.config'

const router = express.Router()

/**
 * GET /api/diagnostic/database
 * Проверка целостности базы данных
 */
router.get('/database', adminMiddleware, async (req, res) => {
	try {
		// Простая проверка подключения к базе данных
		const isConnected = AppDataSource.isInitialized
		
		res.json({
			success: true,
			validation: {
				isValid: isConnected,
				database: 'PostgreSQL',
				connection: isConnected ? 'active' : 'inactive'
			},
			timestamp: new Date().toISOString(),
		})
	} catch (error) {
		res.status(500).json({
			success: false,
			message: 'Ошибка диагностики базы данных',
			error: error instanceof Error ? error.message : 'Неизвестная ошибка',
		})
	}
})

/**
 * POST /api/diagnostic/fix-database
 * Автоматическое исправление проблем в базе данных (заглушка)
 */
router.post('/fix-database', adminMiddleware, async (req, res) => {
	try {
		res.json({
			success: true,
			fixResult: {
				message: 'PostgreSQL database is managed by migrations',
				recommendation: 'Run migrations if needed'
			},
			timestamp: new Date().toISOString(),
		})
	} catch (error) {
		res.status(500).json({
			success: false,
			message: 'Ошибка исправления базы данных',
			error: error instanceof Error ? error.message : 'Неизвестная ошибка',
		})
	}
})

/**
 * GET /api/diagnostic/health
 * Общая проверка состояния системы
 */
router.get('/health', async (req, res) => {
	try {
		const isConnected = AppDataSource.isInitialized

		const healthStatus = {
			database: isConnected ? 'healthy' : 'disconnected',
			uptime: process.uptime(),
			timestamp: new Date().toISOString(),
			connection: isConnected ? 'active' : 'inactive',
		}

		const statusCode = isConnected ? 200 : 500

		res.status(statusCode).json({
			success: isConnected,
			health: healthStatus,
		})
	} catch (error) {
		res.status(500).json({
			success: false,
			health: {
				database: 'error',
				uptime: process.uptime(),
				timestamp: new Date().toISOString(),
				error: error instanceof Error ? error.message : 'Неизвестная ошибка',
			},
		})
	}
})

export default router
