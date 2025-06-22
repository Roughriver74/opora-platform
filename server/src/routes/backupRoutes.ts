import express from 'express'
import {
	listBackups,
	createBackup,
	restoreBackup,
	deleteBackup,
} from '../controllers/backupController'
import { adminMiddleware } from '../middleware/adminMiddleware'

const router = express.Router()

// Все роуты защищены, только для админов
router.use(adminMiddleware)

router.get('/', listBackups)
router.post('/create', createBackup)
router.post('/restore/:timestamp', restoreBackup)
router.delete('/:timestamp', deleteBackup)

export default router
