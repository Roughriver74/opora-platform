import api from './api'
import { FormField } from '../types'

// Сервис для работы с полями формы
export const FormFieldService = {
	async getFormFields(formId: string) {
		try {
			// Получаем форму с полями вместо неправильного запроса к отдельному полю
			const response = await api.get(`/api/forms/${formId}`)
			// Возвращаем только поля из формы
			return response.data.fields || []
		} catch (error) {
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

	async updateField(id: string, fieldData: any) {
		try {
			const response = await api.put(`/api/form-fields/${id}`, fieldData)
			return response.data
		} catch (error) {
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

	async getProducts(query: string) {
		try {
			const response = await api.post('/api/bitrix/search/products', { query })
			return response.data
		} catch (error) {
			throw error
		}
	},

	async getCompanies(query: string) {
		try {
			const response = await api.post('/api/bitrix/search/companies', { query })
			return response.data
		} catch (error) {
			throw error
		}
	},

	async getContacts(query: string) {
		try {
			const response = await api.post('/api/bitrix/search/contacts', { query })
			return response.data
		} catch (error) {
			throw error
		}
	},
}
