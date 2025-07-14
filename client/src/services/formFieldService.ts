import api from './api'
import { FormField } from '../types'

// Сервис для работы с полями формы
export const FormFieldService = {
	async getFormFields(formId: string) {
		try {
			const response = await api.get(`/api/form-fields/${formId}`)
			return response.data
		} catch (error) {
			throw error
		}
	},

	async createFormField(formId: string, fieldData: any) {
		try {
			const response = await api.post(`/api/form-fields/${formId}`, fieldData)
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
}
