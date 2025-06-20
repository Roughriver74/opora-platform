import api from './api'
import { FormField } from '../types'

// Сервис для работы с полями формы
export const FormFieldService = {
	// Получение всех полей
	getAllFields: async () => {
		const response = await api.get('/form-fields')
		return response.data
	},

	// Получение поля по ID
	getFieldById: async (id: string) => {
		const response = await api.get(`/form-fields/${id}`)
		return response.data
	},

	// Создание нового поля
	createField: async (fieldData: Omit<FormField, '_id'>) => {
		try {
			console.log(
				'Отправка данных на сервер:',
				JSON.stringify(fieldData, null, 2)
			)
			const response = await api.post('/form-fields', fieldData)
			console.log('Успешный ответ сервера:', response.data)
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

	// Обновление существующего поля
	updateField: async (id: string, fieldData: Partial<FormField>) => {
		try {
			console.log('🔄 FormFieldService.updateField:', { id, fieldData })
			const response = await api.put(`/form-fields/${id}`, fieldData)
			console.log('✅ Поле успешно обновлено:', response.data)
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

	// Удаление поля
	deleteField: async (id: string) => {
		try {
			console.log('🗑️ Удаление поля с ID:', id)
			const response = await api.delete(`/form-fields/${id}`)
			console.log('✅ Поле успешно удалено:', response.data)
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

	// Получение полей из Битрикс24
	getBitrixFields: async () => {
		const response = await api.get('/form-fields/bitrix/fields')
		return response.data
	},

	// Получение продуктов из каталога Битрикс24
	getProducts: async (query: string = '') => {
		const response = await api.get('/form-fields/bitrix/products', {
			params: { query },
		})
		return response.data
	},

	// Получение списка компаний из Битрикс24
	getCompanies: async (query: string = '') => {
		const response = await api.get('/form-fields/bitrix/companies', {
			params: { query },
		})
		return response.data
	},

	// Получение списка контактов из Битрикс24
	getContacts: async (query: string = '') => {
		const response = await api.get('/form-fields/bitrix/contacts', {
			params: { query },
		})
		return response.data
	},

	// Получение продукта по ID из Битрикс24
	getProductById: async (id: string) => {
		const response = await api.get(`/form-fields/bitrix/product/${id}`)
		return response.data
	},

	// Получение компании по ID из Битрикс24
	getCompanyById: async (id: string) => {
		const response = await api.get(`/form-fields/bitrix/company/${id}`)
		return response.data
	},

	// Получение контакта по ID из Битрикс24
	getContactById: async (id: string) => {
		const response = await api.get(`/form-fields/bitrix/contact/${id}`)
		return response.data
	},

	// Получение пользовательских полей из Битрикс24
	getUserFields: async () => {
		const response = await api.get('/form-fields/bitrix/userfields')
		return response.data
	},

	// Получение значений для конкретного поля типа enumeration
	getEnumFieldValues: async (fieldId: string) => {
		const response = await api.get(`/form-fields/bitrix/enumvalues/${fieldId}`)
		return response.data
	},

	// Получение всех полей типа enumeration с их значениями
	getAllEnumFieldsWithValues: async () => {
		const response = await api.get(
			'/form-fields/bitrix/enum-fields-with-values'
		)
		return response.data
	},

	// Обновление названия раздела (поля типа header)
	updateSectionTitle: async (sectionId: string, newTitle: string) => {
		const response = await api.put(`/form-fields/${sectionId}`, {
			label: newTitle,
		})
		return response.data
	},
}
