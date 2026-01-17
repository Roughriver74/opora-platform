import { Router } from 'express'
import multer from 'multer'
import * as nomenclatureController from '../controllers/nomenclatureController'
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware'

const router = Router()

// Настройка multer для загрузки файлов
const upload = multer({
	dest: 'uploads/',
	limits: {
		fileSize: 10 * 1024 * 1024, // 10MB
	},
	fileFilter: (req, file, cb) => {
		const allowedMimes = [
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'application/vnd.ms-excel',
		]
		if (allowedMimes.includes(file.mimetype)) {
			cb(null, true)
		} else {
			cb(new Error('Только файлы Excel (.xlsx, .xls) разрешены'))
		}
	},
})

// === Публичные маршруты (требуют авторизации, но не админ) ===

// Поиск номенклатуры (для форм)
router.get('/search', authMiddleware, nomenclatureController.search)

// Получить единицы измерения
router.get('/units', authMiddleware, nomenclatureController.getUnits)

// Получить категории
router.get('/categories', authMiddleware, nomenclatureController.getCategories)

// === Административные маршруты ===

// Экспорт в Excel (до :id чтобы не перехватывался)
router.get('/export', authMiddleware, requireAdmin, nomenclatureController.exportToExcel)

// Скачать шаблон Excel
router.get('/template', authMiddleware, requireAdmin, nomenclatureController.downloadTemplate)

// Получить статистику
router.get('/stats', authMiddleware, requireAdmin, nomenclatureController.getStats)

// Получить номенклатуру с ошибками синхронизации
router.get('/sync-errors', authMiddleware, requireAdmin, nomenclatureController.getSyncErrors)

// Получить по SKU
router.get('/sku/:sku', authMiddleware, nomenclatureController.getBySku)

// CRUD для номенклатуры
router.get('/', authMiddleware, requireAdmin, nomenclatureController.getAll)
router.get('/:id', authMiddleware, requireAdmin, nomenclatureController.getById)
router.post('/', authMiddleware, requireAdmin, nomenclatureController.create)
router.put('/:id', authMiddleware, requireAdmin, nomenclatureController.update)
router.delete('/:id', authMiddleware, requireAdmin, nomenclatureController.remove)

// Импорт из Excel
router.post(
	'/import',
	authMiddleware,
	requireAdmin,
	upload.single('file'),
	nomenclatureController.importFromExcel
)

// Синхронизация с Bitrix24
router.post('/sync-bitrix', authMiddleware, requireAdmin, nomenclatureController.syncFromBitrix)

// CRUD для категорий
router.post('/categories', authMiddleware, requireAdmin, nomenclatureController.createCategory)
router.put(
	'/categories/:id',
	authMiddleware,
	requireAdmin,
	nomenclatureController.updateCategory
)
router.delete(
	'/categories/:id',
	authMiddleware,
	requireAdmin,
	nomenclatureController.deleteCategory
)

export default router
