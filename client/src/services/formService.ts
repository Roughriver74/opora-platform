import api from './api'
import { Form } from '../types'



export const FormService = {
	async getAllForms(): Promise<Form[]> {
		try {
			const response = await api.get('/api/forms')
			return response.data
		} catch (error) {
			throw error
		}
	},

	async getFormById(id: string): Promise<Form> {
		try {
			const response = await api.get(`/api/forms/${id}`)
			return response.data
		} catch (error) {
			throw error
		}
	},

	async updateForm(id: string, formData: Partial<Form>): Promise<Form> {
		try {
			const response = await api.put(`/api/forms/${id}`, formData)
			return response.data
		} catch (error) {
			throw error
		}
	},

	async createForm(formData: Omit<Form, '_id'>): Promise<Form> {
		try {
			const response = await api.post('/api/forms', formData)
			return response.data
		} catch (error) {
			throw error
		}
	},

	async deleteForm(id: string) {
		try {
			const response = await api.delete(`/api/forms/${id}`)
			return response.data
		} catch (error) {
			throw error
		}
	},

	async getDealCategories() {
		try {
			const response = await api.get('/settings/bitrix/deal-categories')
			return response.data
		} catch (error) {
			throw error
		}
	},
}
