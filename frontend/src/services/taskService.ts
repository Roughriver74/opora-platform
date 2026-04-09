import { api } from './api'

export interface Task {
	title: string
	description: string
	responsible_id: number
	client_info?: string
	observer_ids?: [string]
	company_bitrix_id: number
	visit_id: number | null
	deadline?: string // Формат: YYYY-MM-DDTHH:MM:SS
	files: File[]
	tags: string[]
}

export const taskService = {
	createTask: async (task: Task) => {
		const formData = new FormData()
		formData.append('title', task.title)
		formData.append('responsible_id', task.responsible_id.toString())
		formData.append('description', task.description)
		formData.append('client_info', task.client_info || '')
		formData.append('company_bitrix_id', task.company_bitrix_id.toString())

		if (task.visit_id !== null) {
			formData.append('visit_id', task.visit_id.toString())
		}

		if (task.deadline) {
			formData.append('deadline', task.deadline)
		}

		if (task.tags && task.tags.length > 0) {
			task.tags.forEach(tag => {
				formData.append('tags', tag)
			})
		}

		// Добавляем каждый файл из массива
		if (Array.isArray(task.files)) {
			task.files.forEach((file) => {
				formData.append('files', file)
			})
		}

		const response = await api.post('/tasks/create_sales_task', formData, {
			headers: {
				'Content-Type': 'multipart/form-data',
			},
		})
		return response.data
	},

	getManagers: async (search?: string) => {
		const response = await api.get('/tasks/get_bitrix_manager', {
			params: { search },
		})
		return response.data
	},
}


