import api from './api'

interface FormData {
	title: string
	description: string
	fields: any[]
}

export const FormService = {
	async getAllForms() {
		try {
			const response = await api.get('/api/forms')
			return response.data
		} catch (error) {
			throw error
		}
	},

	async getFormById(id: string) {
		try {
			const response = await api.get(`/api/forms/${id}`)
			return response.data
		} catch (error) {
			throw error
		}
	},

	async updateForm(id: string, formData: FormData) {
		try {
			const response = await api.put(`/api/forms/${id}`, formData)
			return response.data
		} catch (error) {
			throw error
		}
	},

	async createForm(formData: FormData) {
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
