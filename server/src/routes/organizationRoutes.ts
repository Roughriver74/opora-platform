import { Router } from 'express'
import * as organizationController from '../controllers/organizationController'
import { authMiddleware, requireAuth } from '../middleware/authMiddleware'
import { requireRole } from '../middleware/requireRole'

const router = Router()

// Все маршруты требуют авторизации
router.use(authMiddleware)
router.use(requireAuth)

// Конфигурация текущей организации (доступно всем авторизованным)
router.get('/current/config', organizationController.getCurrentConfig)

// CRUD организаций (суперадмин)
router.get('/', requireRole('superadmin'), organizationController.getAll)
router.post('/', requireRole('superadmin'), organizationController.create)
router.get('/:id', requireRole('superadmin', 'org_admin'), organizationController.getById)
router.put('/:id', requireRole('superadmin', 'org_admin'), organizationController.update)
router.delete('/:id', requireRole('superadmin'), organizationController.deactivate)

// Управление участниками
router.get('/:id/members', requireRole('superadmin', 'org_admin'), organizationController.getMembers)
router.post('/:id/members', requireRole('superadmin', 'org_admin'), organizationController.addMember)
router.put('/:id/members/:userId', requireRole('superadmin', 'org_admin'), organizationController.updateMemberRole)
router.delete('/:id/members/:userId', requireRole('superadmin', 'org_admin'), organizationController.removeMember)

export default router
