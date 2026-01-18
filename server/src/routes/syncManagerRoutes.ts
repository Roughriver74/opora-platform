/**
 * SyncManager Routes - API маршруты для управления синхронизацией
 */

import { Router, Request, Response } from 'express'
import { syncManagerController } from '../controllers/syncManagerController'
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware'

const router = Router()

// Все маршруты требуют авторизации и админских прав
router.use(authMiddleware)
router.use(requireAdmin)

/**
 * @route GET /api/sync-manager/providers
 * @desc Получение списка провайдеров синхронизации
 * @access Admin
 */
router.get('/providers', (req: Request, res: Response) => {
	syncManagerController.getProviders(req, res)
})

/**
 * @route GET /api/sync-manager/providers/:providerId/stats
 * @desc Получение статистики провайдера
 * @access Admin
 */
router.get('/providers/:providerId/stats', (req: Request, res: Response) => {
	syncManagerController.getProviderStats(req, res)
})

/**
 * @route POST /api/sync-manager/providers/:providerId/test
 * @desc Тест подключения к провайдеру
 * @access Admin
 */
router.post('/providers/:providerId/test', (req: Request, res: Response) => {
	syncManagerController.testConnection(req, res)
})

/**
 * @route GET /api/sync-manager/status
 * @desc Получение статуса синхронизации
 * @access Admin
 */
router.get('/status', (req: Request, res: Response) => {
	syncManagerController.getStatus(req, res)
})

/**
 * @route POST /api/sync-manager/run
 * @desc Запуск синхронизации для конкретного провайдера и типа сущности
 * @access Admin
 * @body { providerId: string, entityType: string, direction?: string, options?: object }
 */
router.post('/run', (req: Request, res: Response) => {
	syncManagerController.runSync(req, res)
})

/**
 * @route POST /api/sync-manager/run-all
 * @desc Запуск полной синхронизации всех провайдеров
 * @access Admin
 * @body { options?: object }
 */
router.post('/run-all', (req: Request, res: Response) => {
	syncManagerController.runSyncAll(req, res)
})

// =====================================================
// Быстрые импорты из Bitrix24
// =====================================================

/**
 * @route POST /api/sync-manager/import/companies
 * @desc Импорт компаний из Bitrix24
 * @access Admin
 */
router.post('/import/companies', (req: Request, res: Response) => {
	syncManagerController.importCompanies(req, res)
})

/**
 * @route POST /api/sync-manager/import/contacts
 * @desc Импорт контактов из Bitrix24
 * @access Admin
 */
router.post('/import/contacts', (req: Request, res: Response) => {
	syncManagerController.importContacts(req, res)
})

/**
 * @route POST /api/sync-manager/import/nomenclature
 * @desc Импорт номенклатуры из Bitrix24
 * @access Admin
 */
router.post('/import/nomenclature', (req: Request, res: Response) => {
	syncManagerController.importNomenclature(req, res)
})

export default router
