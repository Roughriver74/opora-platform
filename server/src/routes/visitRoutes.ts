import express, { Request, Response } from 'express'
import { moduleGuard } from '../middleware/moduleGuard'
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

router.get('/calendar', (req: Request, res: Response) => getVisitCalendar(req, res))
router.get('/', (req: Request, res: Response) => getVisits(req, res))
router.post('/', (req: Request, res: Response) => createVisit(req, res))
router.get('/:id', (req: Request, res: Response) => getVisitById(req, res))
router.put('/:id', (req: Request, res: Response) => updateVisit(req, res))
router.patch('/:id/status', (req: Request, res: Response) => updateVisitStatus(req, res))
router.delete('/:id', (req: Request, res: Response) => deleteVisit(req, res))

export default router
