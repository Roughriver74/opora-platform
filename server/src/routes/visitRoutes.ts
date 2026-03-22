import express from 'express'
import { moduleGuard } from '../middleware/moduleGuard'
import { planLimitsGuard } from '../middleware/planLimitsGuard'
import {
	getVisits,
	getVisitById,
	getVisitCalendar,
	createVisit,
	updateVisit,
	updateVisitStatus,
	deleteVisit,
} from '../controllers/visitController'

const router = express.Router()

router.use(moduleGuard('visits'))

router.get('/calendar', getVisitCalendar as any)
router.get('/', getVisits as any)
router.post('/', planLimitsGuard('visits'), createVisit as any)
router.get('/:id', getVisitById as any)
router.put('/:id', updateVisit as any)
router.patch('/:id/status', updateVisitStatus as any)
router.delete('/:id', deleteVisit as any)

export default router
