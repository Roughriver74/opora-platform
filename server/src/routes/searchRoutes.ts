import { Router } from 'express'
import * as searchController from '../controllers/searchController'
import {
	authMiddleware,
	requireAdmin,
	requireAuth,
} from '../middleware/authMiddleware'

const router = Router()

// Универсальный поиск через Elasticsearch (требует авторизации)
router.post('/search', authMiddleware, requireAuth, searchController.search)

// Автодополнение (требует авторизации)
router.post('/suggest', authMiddleware, requireAuth, searchController.suggest)

// Поиск продуктов через Elasticsearch (требует авторизации)
router.post(
	'/products',
	authMiddleware,
	requireAuth,
	searchController.searchProducts
)

// Поиск компаний через Elasticsearch (требует авторизации для фильтрации)
router.post(
	'/companies',
	authMiddleware,
	requireAuth,
	searchController.searchCompanies
)

// Поиск контактов через Elasticsearch (требует авторизации)
router.post(
	'/contacts',
	authMiddleware,
	requireAuth,
	searchController.searchContacts
)

// Поиск submissions через Elasticsearch (требует авторизации)
router.post(
	'/submissions',
	authMiddleware,
	requireAuth,
	(req, res, next) => {
		console.log('Route /submissions called with:', req.body)
		next()
	},
	searchController.searchSubmissions
)

// Синхронизация данных с Elasticsearch (временно без проверки прав для тестирования)
router.post('/sync', searchController.syncData)

// Временный эндпоинт для синхронизации без проверки прав
router.post('/sync-data', searchController.syncData)

// Проверка здоровья Elasticsearch
router.get('/health', searchController.healthCheck)

// Получение агрегаций по типам
router.get('/aggregations', searchController.getAggregations)

export default router
