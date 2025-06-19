import express from 'express'
import {
	validateFormFieldsIntegrity,
	autoFixDatabaseIssues,
} from '../utils/databaseValidation'
import { adminMiddleware } from '../middleware/adminMiddleware'

const router = express.Router()

/**
 * GET /api/diagnostic/database
 * Проверка целостности базы данных
 */
router.get('/database', adminMiddleware, async (req, res) => {
	try {
		const validation = await validateFormFieldsIntegrity()

		res.json({
			success: true,
			validation,
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
 * Автоматическое исправление проблем в базе данных
 */
router.post('/fix-database', adminMiddleware, async (req, res) => {
	try {
		const fixResult = await autoFixDatabaseIssues()

		// Повторная проверка после исправлений
		const validationAfterFix = await validateFormFieldsIntegrity()

		res.json({
			success: true,
			fixResult,
			validationAfterFix,
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
		const validation = await validateFormFieldsIntegrity()

		const healthStatus = {
			database: validation.isValid ? 'healthy' : 'issues_detected',
			uptime: process.uptime(),
			timestamp: new Date().toISOString(),
			issues: validation.issues,
			statistics: validation.statistics,
		}

		const statusCode = validation.isValid ? 200 : 500

		res.status(statusCode).json({
			success: validation.isValid,
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
