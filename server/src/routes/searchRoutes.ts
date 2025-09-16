import { Router } from 'express'
import * as searchController from '../controllers/searchController'
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware'

const router = Router()

// Универсальный поиск через Elasticsearch
router.post('/search', searchController.search)

// Автодополнение
router.post('/suggest', searchController.suggest)

// Поиск продуктов через Elasticsearch (временно без аутентификации для тестирования)
router.post('/products', searchController.searchProducts)

// Поиск компаний через Elasticsearch (требует аутентификации для фильтрации)
router.post('/companies', authMiddleware, searchController.searchCompanies)

// Поиск контактов через Elasticsearch
router.post('/contacts', searchController.searchContacts)

// Синхронизация данных с Elasticsearch (временно без проверки прав для тестирования)
router.post('/sync', searchController.syncData)

// Временный эндпоинт для синхронизации без проверки прав
router.post('/sync-data', searchController.syncData)

// Проверка здоровья Elasticsearch
router.get('/health', searchController.healthCheck)

// Получение агрегаций по типам
router.get('/aggregations', searchController.getAggregations)

export default router
