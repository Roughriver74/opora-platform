import { Request, Response, NextFunction } from 'express'
import Form from '../models/Form'
import { DatabaseIdUtils, MongoStringId } from '../types/database'

/**
 * Middleware для валидации связей между формами и полями
 */
export const validateFormFieldRelation = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void> => {
	try {
		const { formId } = req.body

		// Если нет formId, пропускаем валидацию (поле может быть создано без связи)
		if (!formId) {
			next()
			return
		}

		// Проверяем формат ID
		if (!DatabaseIdUtils.isValidObjectId(formId)) {
			res.status(400).json({
				message: 'Некорректный формат formId',
				field: 'formId',
				received: formId,
			})
			return
		}

		// Проверяем существование формы
		const formExists = await Form.findById(formId)
		if (!formExists) {
			res.status(400).json({
				message: 'Форма с указанным ID не существует',
				field: 'formId',
				received: formId,
			})
			return
		}

		// Приводим formId к строке для консистентности
		req.body.formId = DatabaseIdUtils.toString(formId)

		console.log(
			`✅ Валидация связи: поле будет привязано к форме ${req.body.formId}`
		)
		next()
	} catch (error) {
		console.error('❌ Ошибка валидации связи:', error)
		res.status(500).json({
			message: 'Ошибка валидации связи с формой',
		})
	}
}

/**
 * Middleware для валидации при обновлении полей
 */
export const validateFormFieldUpdateRelation = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void> => {
	try {
		const { formId } = req.body

		// Если formId не изменяется, пропускаем валидацию
		if (!formId) {
			next()
			return
		}

		// Аналогичная валидация для обновления
		if (!DatabaseIdUtils.isValidObjectId(formId)) {
			res.status(400).json({
				message: 'Некорректный формат formId при обновлении',
				field: 'formId',
				received: formId,
			})
			return
		}

		const formExists = await Form.findById(formId)
		if (!formExists) {
			res.status(400).json({
				message: 'Форма с указанным ID не существует при обновлении',
				field: 'formId',
				received: formId,
			})
			return
		}

		req.body.formId = DatabaseIdUtils.toString(formId)

		console.log(
			`✅ Валидация обновления: поле остается привязанным к форме ${req.body.formId}`
		)
		next()
	} catch (error) {
		console.error('❌ Ошибка валидации обновления связи:', error)
		res.status(500).json({
			message: 'Ошибка валидации обновления связи с формой',
		})
	}
}
