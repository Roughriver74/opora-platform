import { Router } from 'express'
import * as formFieldController from '../controllers/formFieldController'
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware'

const router = Router()

// Получение всех полей
router.get('/', formFieldController.getAllFields)

router.post('/', authMiddleware, requireAdmin, formFieldController.createField)

// Битрикс маршруты - должны быть перед маршрутами с параметрами
// Получение полей из Битрикс24
router.get('/bitrix/fields', formFieldController.getBitrixFields)

// Получение продуктов из каталога Битрикс24
router.get('/bitrix/products', formFieldController.getProductsList)

// Получение списка компаний из Битрикс24 (требует аутентификации для фильтрации)
router.get(
	'/bitrix/companies',
	authMiddleware,
	formFieldController.getCompaniesList
)

// Получение списка контактов из Битрикс24
router.get('/bitrix/contacts', formFieldController.getContactsList)

// POST роуты для поиска (новые)
router.post('/bitrix/search/products', formFieldController.searchProducts)
router.post(
	'/bitrix/search/companies',
	authMiddleware,
	formFieldController.searchCompanies
)
router.post('/bitrix/search/contacts', formFieldController.searchContacts)

// Обновление заголовка раздела (header поля)
router.put('/section/:id', authMiddleware, requireAdmin, async (req, res) => {
	try {
		const { label } = req.body
		const field = await require('../models/FormField').default.findById(
			req.params.id
		)

		if (!field) {
			res.status(404).json({ message: 'Поле не найдено' })
			return
		}

		if (field.type !== 'header') {
			res
				.status(400)
				.json({ message: 'Можно обновлять только заголовки разделов' })
			return
		}

		field.label = label
		await field.save()

		res.json(field)
	} catch (error: any) {
		res.status(500).json({ message: error.message })
	}
})

// Получение пользовательских полей из Битрикс24
router.get('/bitrix/userfields', formFieldController.getUserFields)

// Получение значений для конкретного поля типа enumeration
router.get(
	'/bitrix/enumvalues/:fieldId',
	formFieldController.getEnumFieldValues
)

// Получение всех полей типа enumeration с их значениями
router.get(
	'/bitrix/enum-fields-with-values',
	formFieldController.getAllEnumFieldsWithValues
)

// Отладочный метод для исследования структуры полей (только для разработки)
router.get('/bitrix/debug-fields', formFieldController.debugFieldStructure)

// Обновление порядка полей
router.put('/order', authMiddleware, requireAdmin, formFieldController.updateFieldsOrder)

// Переключение активности поля
router.patch('/:id/toggle-active', authMiddleware, requireAdmin, formFieldController.toggleFieldActive)

// Маршруты с параметрами должны идти последними
router.get('/:id', formFieldController.getFieldById)

router.put(
	'/:id',
	authMiddleware,
	requireAdmin,
	formFieldController.updateField
)

router.delete(
	'/:id',
	authMiddleware,
	requireAdmin,
	formFieldController.deleteField
)

export default router
