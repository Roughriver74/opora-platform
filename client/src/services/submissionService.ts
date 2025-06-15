import api from './api'
import { FormSubmission, FormSubmissionResponse } from '../types'

// Типы для заявок
export interface Submission {
	_id: string
	submissionNumber: string
	formId: {
		_id: string
		name: string
		title: string
	}
	userId?: {
		_id: string
		name: string
		email: string
		firstName?: string
		lastName?: string
	}
	formData: Record<string, any>
	status: string
	priority: 'low' | 'medium' | 'high' | 'urgent'
	bitrixDealId?: string
	bitrixCategoryId?: string
	bitrixSyncStatus: 'pending' | 'synced' | 'failed'
	bitrixSyncError?: string
	assignedTo?: {
		_id: string
		name: string
		email: string
	}
	notes?: string
	tags: string[]
	createdAt: string
	updatedAt: string
}

export interface SubmissionHistory {
	_id: string
	submissionId: string
	action: string
	changeType: 'status_change' | 'assignment' | 'note_added' | 'data_update'
	description: string
	oldValue?: any
	newValue?: any
	comment?: string
	changedBy: {
		_id: string
		name: string
		email: string
		firstName?: string
		lastName?: string
	}
	changedAt: string
	userId?: {
		_id: string
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
		const response = await api.post('/submissions/submit', submission)
		return response.data
	},

	// Получение всех заявок (для админов)
	getSubmissions: async (
		filters: SubmissionFilters & { page?: number; limit?: number }
	): Promise<SubmissionResponse> => {
		const response = await api.get('/submissions', { params: filters })
		return response.data
	},

	// Получение заявок текущего пользователя
	getMySubmissions: async (params: {
		page?: number
		limit?: number
	}): Promise<SubmissionResponse> => {
		const response = await api.get('/submissions/my', { params })
		return response.data
	},

	// Получение заявки по ID
	getSubmissionById: async (id: string): Promise<SubmissionDetailsResponse> => {
		const response = await api.get(`/submissions/${id}`)
		return response.data
	},

	// Обновление статуса заявки
	updateStatus: async (
		id: string,
		status: string,
		comment?: string
	): Promise<{ success: boolean }> => {
		const response = await api.patch(`/submissions/${id}/status`, {
			status,
			comment,
		})
		return response.data
	},

	// Получение статусов из Битрикс24
	getBitrixDealStages: async (
		categoryId: string
	): Promise<BitrixStagesResponse> => {
		const response = await api.get(`/submissions/bitrix/stages/${categoryId}`)
		return response.data
	},

	// Обновление заявки
	updateSubmission: async (
		id: string,
		data: Partial<Submission>
	): Promise<{ success: boolean; data: Submission }> => {
		const response = await api.put(`/submissions/${id}`, data)
		return response.data
	},

	// Удаление заявки
	deleteSubmission: async (id: string): Promise<{ success: boolean }> => {
		const response = await api.delete(`/submissions/${id}`)
		return response.data
	},
}

// Экспорт по умолчанию для обратной совместимости
export default SubmissionService
