import { Router } from 'express';
import * as formFieldController from '../controllers/formFieldController';
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

// Получение всех полей
router.get('/', formFieldController.getAllFields);

router.post('/', authMiddleware, requireAdmin, formFieldController.createField);

// Битрикс маршруты - должны быть перед маршрутами с параметрами
// Получение полей из Битрикс24
router.get('/bitrix/fields', formFieldController.getBitrixFields);

// Получение продуктов из каталога Битрикс24
router.get('/bitrix/products', formFieldController.getProductsList);

// Получение списка компаний из Битрикс24
router.get('/bitrix/companies', formFieldController.getCompaniesList);

// Получение списка контактов из Битрикс24
router.get('/bitrix/contacts', formFieldController.getContactsList);

// Получение пользовательских полей из Битрикс24
router.get('/bitrix/userfields', formFieldController.getUserFields);

// Получение значений для конкретного поля типа enumeration
router.get('/bitrix/enumvalues/:fieldId', formFieldController.getEnumFieldValues);

// Получение всех полей типа enumeration с их значениями
router.get('/bitrix/enum-fields-with-values', formFieldController.getAllEnumFieldsWithValues);

// Отладочный метод для исследования структуры полей (только для разработки)
router.get('/bitrix/debug-fields', formFieldController.debugFieldStructure);

// Маршруты с параметрами должны идти последними
router.get('/:id', formFieldController.getFieldById);

router.put('/:id', authMiddleware, requireAdmin, formFieldController.updateField);

router.delete('/:id', authMiddleware, requireAdmin, formFieldController.deleteField);

export default router;
