import api from './api'
import { FormField } from '../types'

// Сервис для работы с полями формы
export const FormFieldService = {
	// Получение всех полей
	async getAllFields() {
		const response = await api.get('/api/form-fields')
		return response.data
	},

	// Получение поля по ID
	async getFieldById(id: string) {
		const response = await api.get(`/api/form-fields/${id}`)
		return response.data
	},

	// Создание нового поля
	async createField(fieldData: Omit<FormField, '_id'>) {
		try {
			console.log(
				'Отправка данных на сервер:',
				JSON.stringify(fieldData, null, 2)
			)
			const response = await api.post('/api/form-fields', fieldData)
			return response.data
		} catch (error: any) {
			console.error('Ошибка при создании поля:', error)
			if (error.response) {
				// Сервер ответил с ошибкой
				console.error('Данные ответа:', error.response.data)
				console.error('Статус ответа:', error.response.status)
				console.error('Заголовки ответа:', error.response.headers)
			}
			throw error
		}
	},

	// Удаление поля
	async deleteField(id: string) {
		try {
			const response = await api.delete(`/api/form-fields/${id}`)
			return response.data
		} catch (error: any) {
			console.error('❌ Ошибка при удалении поля:', error)
			if (error.response) {
				console.error('Статус ответа:', error.response.status)
				console.error('Данные ответа:', error.response.data)
				console.error('URL запроса:', error.config?.url)
			}
			throw error
		}
	},

	async getFormFields(formId: string, includeInactive = true) {
		if (!formId) {
			// Если нет ID формы, возвращаем пустой массив
			return []
		}
		try {
			// Запрашиваем поля формы через правильный эндпоинт
			const response = await api.get('/api/form-fields', {
				params: { formId, includeInactive },
			})
			// Возвращаем массив полей
			return response.data || []
		} catch (error) {
			console.error('Ошибка загрузки полей формы:', error)
			throw error
		}
	},

	async createFormField(formId: string, fieldData: any) {
		try {
			// Добавляем formId в данные поля и делаем POST к /api/form-fields
			const fieldWithFormId = { ...fieldData, formId }
			const response = await api.post('/api/form-fields', fieldWithFormId)
			return response.data
		} catch (error) {
			throw error
		}
	},

	// Обновление существующего поля
	async updateField(id: string, fieldData: Partial<FormField>) {
		try {
			const response = await api.put(`/api/form-fields/${id}`, fieldData)
			return response.data
		} catch (error: any) {
			console.error('❌ Ошибка при обновлении поля:', error)
			if (error.response) {
				console.error('Статус ответа:', error.response.status)
				console.error('Данные ответа:', error.response.data)
				console.error('URL запроса:', error.config?.url)
				console.error('Отправленные данные:', fieldData)
			}
			throw error
		}
	},

	async deleteFormField(id: string) {
		try {
			const response = await api.delete(`/api/form-fields/${id}`)
			return response.data
		} catch (error) {
			throw error
		}
	},

	async updateFieldOrder(updates: Array<{ id: string; order: number }>) {
		try {
			const response = await api.put('/api/form-fields/order', { updates })
			return response.data
		} catch (error) {
			throw error
		}
	},

	async getBitrixOptions(sourceConfig: any) {
		try {
			const response = await api.post('/api/bitrix/options', sourceConfig)
			return response.data
		} catch (error) {
			throw error
		}
	},

	async updateSectionTitle(sectionId: string, newTitle: string) {
		try {
			const response = await api.put(`/api/form-fields/section/${sectionId}`, {
				label: newTitle,
			})
			return response.data
		} catch (error) {
			throw error
		}
	},

	async getProducts(query: string = '') {
		// Используем новый Elasticsearch API с оптимизациями
		const response = await api.post('/api/search/products', {
			query,
			limit: 20,
			offset: 0,
			fuzzy: true, // Включаем обработку опечаток
		})
		return response.data
	},

	async getCompanies(query: string = '') {
		// Используем новый Elasticsearch API с оптимизациями
		const response = await api.post('/api/search/companies', {
			query,
			limit: 20,
			offset: 0,
			fuzzy: true, // Включаем обработку опечаток
		})
		return response.data
	},

	async getContacts(query: string = '') {
		// Используем новый Elasticsearch API с оптимизациями
		const response = await api.post('/api/search/contacts', {
			query,
			limit: 20,
			offset: 0,
			fuzzy: true, // Включаем обработку опечаток
		})
		return response.data
	},

	// Получение полей из Битрикс24
	async getBitrixFields() {
		const response = await api.get('/api/form-fields/bitrix/fields')
		return response.data
	},

	// Получение продукта по ID из Битрикс24
	async getProductById(id: string) {
		const response = await api.get(`/api/form-fields/bitrix/product/${id}`)
		return response.data
	},

	// Получение компании по ID из Битрикс24
	async getCompanyById(id: string) {
		const response = await api.get(`/api/form-fields/bitrix/company/${id}`)
		return response.data
	},

	// Получение контакта по ID из Битрикс24
	async getContactById(id: string) {
		const response = await api.get(`/api/form-fields/bitrix/contact/${id}`)
		return response.data
	},

	// Получение пользовательских полей из Битрикс24
	async getUserFields() {
		const response = await api.get('/api/form-fields/bitrix/userfields')
		return response.data
	},

	// Получение значений для конкретного поля типа enumeration
	async getEnumFieldValues(fieldId: string) {
		const response = await api.get(
			`/api/form-fields/bitrix/enumvalues/${fieldId}`
		)
		return response.data
	},

	// Получение всех полей типа enumeration с их значениями
	async getAllEnumFieldsWithValues() {
		const response = await api.get(
			'/api/form-fields/bitrix/enum-fields-with-values'
		)
		return response.data
	},
}
