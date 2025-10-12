import api from './api'
import { FormSubmission, FormSubmissionResponse } from '../types'

// Типы для заявок
export interface Submission {
	isPeriodSubmission: any
	id: string
	submissionNumber: string
	formId: {
		id: string
		name: string
		title: string
	}
	userId?: string
	userName?: string
	userEmail?: string
	title: string // Название заявки из Битрикс24
	status: string
	priority: 'low' | 'medium' | 'high' | 'urgent'
	bitrixDealId: string // Теперь обязательно
	bitrixCategoryId?: string
	bitrixSyncStatus: 'pending' | 'synced' | 'failed'
	bitrixSyncError?: string
	assignedTo?: {
		id: string
		name: string
		email: string
	}
	notes?: string
	tags: string[]
	formData?: Record<string, any> // Данные формы
	createdAt: string
	updatedAt: string
}

export interface SubmissionHistory {
	id: string
	submissionId: string
	action: string
	changeType: 'status_change' | 'assignment' | 'note_added' | 'data_update'
	description: string
	oldValue?: any
	newValue?: any
	comment?: string
	changedBy: {
		id: string
		name: string
		email: string
		firstName?: string
		lastName?: string
	}
	changedAt: string
	userId?: {
		id: string
		name: string
		email: string
		firstName?: string
		lastName?: string
	}
	createdAt: string
}

export interface SubmissionFilters {
	status?: string
	priority?: string
	assignedTo?: string
	userId?: string
	dateFrom?: string
	dateTo?: string
	search?: string
	tags?: string[]
}

export interface SubmissionResponse {
	success: boolean
	data: Submission[]
	total?: number
	pagination: {
		page: number
		limit: number
		total: number
		pages: number
	}
}

export interface SubmissionDetailsResponse {
	success: boolean
	data: {
		submission: Submission
		history: SubmissionHistory[]
		formFields?: any[] // Поля формы для отображения названий
	}
}

export interface BitrixStage {
	id: string
	name: string
	sort: number
}

export interface BitrixStagesResponse {
	success: boolean
	data: BitrixStage[]
}

// Сервис для работы с заявками
export const SubmissionService = {
	// Отправка формы заявки
	submitForm: async (
		formId: string,
		values: Record<string, any>,
		submission: FormSubmission
	): Promise<FormSubmissionResponse> => {
		const response = await api.post('/api/submissions/submit', submission)
		return response.data
	},

	// Получение всех заявок (для админов)
	getSubmissions: async (
		filters: SubmissionFilters & { page?: number; limit?: number }
	): Promise<SubmissionResponse> => {
		const response = await api.get('/api/submissions', { params: filters })
		return response.data
	},

	// Получение заявок текущего пользователя
	getMySubmissions: async (
		filters: SubmissionFilters & { page?: number; limit?: number }
	): Promise<SubmissionResponse> => {
		const response = await api.get('/api/submissions/my', { params: filters })
		return response.data
	},

	// Получение заявки по ID
	getSubmissionById: async (id: string): Promise<SubmissionDetailsResponse> => {
		const response = await api.get(`/api/submissions/${id}`)
		return response.data
	},

	// Получение заявки с актуальными данными из Битрикс24 для редактирования
	getSubmissionForEdit: async (
		id: string
	): Promise<{
		success: boolean
		data: {
			id: string
			formId: string
			formData: Record<string, any>
			preloadedOptions?: Record<string, any[]>
		}
	}> => {
		if (!id || typeof id !== 'string') {
			throw new Error('ID заявки обязателен и должен быть строкой')
		}

		try {
			const response = await api.get(`/api/submissions/${id}/edit`)

			// Валидация ответа
			if (!response.data || typeof response.data !== 'object') {
				throw new Error('Неверный формат ответа от сервера')
			}

			if (!response.data.success) {
				throw new Error(
					response.data.message || 'Не удалось получить данные заявки'
				)
			}

			// Проверяем обязательные поля
			const data = response.data.data
			if (!data?.id || !data?.formId) {
				console.log({
					hasDataId: !!data?.id,
					hasFormId: !!data?.formId,
					formIdType: typeof data?.formId,
					data: data,
				})
				throw new Error('Получены неполные данные заявки')
			}

			return response.data
		} catch (error: any) {
			// Улучшенная обработка ошибок
			if (error.response?.status === 404) {
				throw new Error('Заявка не найдена')
			} else if (error.response?.status === 403) {
				throw new Error('Нет доступа к данной заявке')
			}

			throw error
		}
	},

	// Копирование заявки
	copySubmission: async (
		id: string
	): Promise<{
		success: boolean
		message: string
		data: {
			formId: string
			formData: Record<string, any>
			preloadedOptions?: Record<string, any[]>
			originalTitle: string
			originalSubmissionNumber: string
			isCopy?: boolean
		}
	}> => {
		const response = await api.post(`/api/submissions/${id}/copy`)
		return response.data
	},

	// Обновление статуса заявки
	updateStatus: async (
		id: string,
		status: string,
		comment?: string
	): Promise<{ success: boolean }> => {
		if (!id || typeof id !== 'string') {
			throw new Error('ID заявки обязателен и должен быть строкой')
		}

		if (!status || typeof status !== 'string') {
			throw new Error('Статус обязателен и должен быть строкой')
		}

		// Проверяем валидные статусы
		// Разрешаем как внутренние статусы, так и статусы Битрикс24 (формат C{categoryId}:{statusCode})
		const validInternalStatuses = [
			'new',
			'in_progress',
			'completed',
			'cancelled',
			'on_hold',
		]
		const isBitrixStatus = /^C\d+:[A-Z0-9_]+$/.test(status) // Проверка формата статуса Битрикс24

		if (!validInternalStatuses.includes(status) && !isBitrixStatus) {
			throw new Error(
				`Недопустимый статус: ${status}. Разрешены внутренние статусы: ${validInternalStatuses.join(
					', '
				)} или статусы Битрикс24 (формат C{categoryId}:{statusCode})`
			)
		}

		try {
			const response = await api.patch(`/api/submissions/${id}/status`, {
				status,
				comment: comment || '',
			})

			if (!response.data || typeof response.data.success !== 'boolean') {
				throw new Error('Неверный формат ответа от сервера')
			}

			return response.data
		} catch (error: any) {
			// Улучшенная обработка ошибок
			if (error.response?.status === 404) {
				throw new Error('Заявка не найдена')
			} else if (error.response?.status === 403) {
				throw new Error('Нет доступа к изменению статуса данной заявки')
			} else if (error.response?.status === 400) {
				throw new Error(
					error.response.data?.message || 'Неверные данные запроса'
				)
			}

			throw error
		}
	},

	// Получение статусов из Битрикс24
	getBitrixDealStages: async (
		categoryId: string
	): Promise<BitrixStagesResponse> => {
		const response = await api.get(
			`/api/submissions/bitrix/stages/${categoryId}`
		)
		return response.data
	},

	// Обновление заявки
	updateSubmission: async (
		id: string,
		data: Partial<Submission>
	): Promise<{ success: boolean; data: Submission }> => {
		const response = await api.put(`/api/submissions/${id}`, data)
		return response.data
	},

	// Удаление заявки
	deleteSubmission: async (id: string): Promise<{ success: boolean }> => {
		const response = await api.delete(`/api/submissions/${id}`)
		return response.data
	},

	// Отмена заявки
	cancelSubmission: async (
		id: string,
		comment?: string
	): Promise<{ success: boolean; message: string; data: any }> => {
		const response = await api.post(`/api/submissions/${id}/cancel`, {
			comment,
		})
		return response.data
	},

	// Получение данных полей формы для заявки
	getSubmissionFormFields: async (
		id: string
	): Promise<{
		success: boolean
		data: { formFields: Record<string, any> | null }
	}> => {
		const response = await api.get(`/api/submissions/${id}/form-fields`)
		return response.data
	},
}

// Экспорт по умолчанию для обратной совместимости
export default SubmissionService
