import { Router } from 'express'
import multer from 'multer'
import * as companyController from '../controllers/companyController'
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

// Поиск компаний (для форм)
router.get('/search', authMiddleware, companyController.search)

// === Административные маршруты ===

// Экспорт в Excel (до :id чтобы не перехватывался)
router.get('/export', authMiddleware, requireAdmin, companyController.exportToExcel)

// Скачать шаблон Excel
router.get('/template', authMiddleware, requireAdmin, companyController.downloadTemplate)

// Получить статистику (до :id чтобы не перехватывался)
router.get('/stats', authMiddleware, requireAdmin, companyController.getStats)

// Получить компании с ошибками синхронизации
router.get('/sync-errors', authMiddleware, requireAdmin, companyController.getSyncErrors)

// Получить компании, ожидающие синхронизации
router.get('/pending-sync', authMiddleware, requireAdmin, companyController.getPendingSync)

// Найти по ИНН
router.get('/by-inn/:inn', authMiddleware, companyController.getByInn)

// CRUD для компаний
router.get('/', authMiddleware, requireAdmin, companyController.getAll)
router.get('/:id', authMiddleware, companyController.getById)
router.post('/', authMiddleware, requireAdmin, companyController.create)
router.put('/:id', authMiddleware, requireAdmin, companyController.update)
router.delete('/:id', authMiddleware, requireAdmin, companyController.remove)

// Полное удаление (hard delete)
router.delete('/:id/hard', authMiddleware, requireAdmin, companyController.hardDelete)

// Импорт из Excel
router.post(
	'/import',
	authMiddleware,
	requireAdmin,
	upload.single('file'),
	companyController.importFromExcel
)

export default router
