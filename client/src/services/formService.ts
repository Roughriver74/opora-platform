import api from './api'
import { Form } from '../types'

// Сервис для работы с формами
export const FormService = {
	// Получение всех форм
	getAllForms: async () => {
		const response = await api.get('/forms')
		return response.data
	},

	// Получение формы по ID
	getFormById: async (id: string) => {
		const response = await api.get(`/forms/${id}`)
		return response.data
	},

	// Создание новой формы
	createForm: async (formData: Omit<Form, '_id'>) => {
		const response = await api.post('/forms', formData)
		return response.data
	},

	// Обновление существующей формы
	updateForm: async (id: string, formData: Partial<Form>) => {
		try {
			console.log('FormService.updateForm вызван с ID:', id)
			console.log(
				'FormService.updateForm данные:',
				JSON.stringify(formData, null, 2)
			)

			const response = await api.put(`/forms/${id}`, formData)

			console.log('FormService.updateForm успешно:', response.data)
			return response.data
		} catch (error: any) {
			console.error('Ошибка в FormService.updateForm:', error)
			console.error('Response data:', error.response?.data)
			console.error('Response status:', error.response?.status)

			// Пробрасываем ошибку дальше с дополнительной информацией
			throw {
				message:
					error.response?.data?.message ||
					error.message ||
					'Ошибка при обновлении формы',
				status: error.response?.status,
				details: error.response?.data?.details,
				originalError: error,
			}
		}
	},

	// Удаление формы
	deleteForm: async (id: string) => {
		const response = await api.delete(`/forms/${id}`)
		return response.data
	},

	// Получение категорий сделок из Битрикс24
	getDealCategories: async () => {
		try {
			// Пробуем путь без префикса /api
			console.log('Запрашиваем категории сделок без префикса /api')
			const response = await api.get('/forms/bitrix/deal-categories')
			return response.data
		} catch (error) {
			console.error('Ошибка при получении категорий:', error)
			return { result: [] } // Возвращаем пустой список категорий в случае ошибки
		}
	},
}
