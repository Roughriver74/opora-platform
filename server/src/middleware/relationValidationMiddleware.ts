import { Request, Response, NextFunction } from 'express'
import { AppDataSource } from '../database/config/database.config'
import { Form } from '../database/entities/Form.entity'
import { validate as isUUID } from 'uuid'

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

		// Проверяем формат ID (теперь используем UUID)
		if (!isUUID(formId)) {
			res.status(400).json({
				message: 'Некорректный формат formId (ожидается UUID)',
				field: 'formId',
				received: formId,
			})
			return
		}

		// Проверяем существование формы
		const formRepository = AppDataSource.getRepository(Form)
		const formExists = await formRepository.findOne({ where: { id: formId } })
		if (!formExists) {
			res.status(400).json({
				message: 'Форма с указанным ID не существует',
				field: 'formId',
				received: formId,
			})
			return
		}

		// formId уже в правильном формате UUID
		req.body.formId = formId

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

		// Проверяем формат ID (используем UUID)
		if (!isUUID(formId)) {
			res.status(400).json({
				message: 'Некорректный формат formId при обновлении (ожидается UUID)',
				field: 'formId',
				received: formId,
			})
			return
		}

		// Проверяем существование формы
		const formRepository = AppDataSource.getRepository(Form)
		const formExists = await formRepository.findOne({ where: { id: formId } })
		if (!formExists) {
			res.status(400).json({
				message: 'Форма с указанным ID не существует при обновлении',
				field: 'formId',
				received: formId,
			})
			return
		}

		// formId уже в правильном формате UUID
		req.body.formId = formId

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
