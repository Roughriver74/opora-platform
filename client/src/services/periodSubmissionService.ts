import axios from 'axios'

// Используем тот же подход, что и в других сервисах
const API_URL =
	process.env.NODE_ENV === 'production'
		? '' // Пустой baseURL для использования относительных путей через nginx proxy
		: 'http://localhost:5001' // Прямой URL для разработки

const api = axios.create({
	baseURL: API_URL,
	timeout: 300000,
	headers: {
		'Content-Type': 'application/json',
	},
	withCredentials: true,
})

// Интерцептор для добавления токена авторизации
api.interceptors.request.use(
	config => {
		const token = localStorage.getItem('token')
		if (token) {
			config.headers.Authorization = `Bearer ${token}`
		}
		return config
	},
	error => Promise.reject(error)
)

export interface PeriodConfig {
	startDate: string
	endDate: string
	dateFieldName: string
	startTime?: string // Время начала (HH:mm)
	endTime?: string // Время окончания (HH:mm)
	timeFieldName?: string // Название поля времени в форме
	priority?: 'low' | 'medium' | 'high'
}

export interface CreatePeriodSubmissionsRequest {
	formId: string
	formData: Record<string, any>
	periodConfig: PeriodConfig
}

export interface PeriodSubmissionsResponse {
	success: boolean
	message: string
	data: {
		periodGroupId: string
		totalCreated: number
		period: {
			startDate: string
			endDate: string
			daysCount: number
		}
		submissions: Array<{
			id: string
			submissionNumber: string
			bitrixDealId?: string
			periodPosition: number
			date: string
		}>
	}
}

export interface PeriodGroupResponse {
	success: boolean
	data: {
		id: string
		formId: string
		startDate: string
		endDate: string
		totalSubmissions: number
		status: string
		dateFieldName: string
		createdAt: string
		updatedAt: string
	}
}

class PeriodSubmissionService {
	/**
	 * Создание периодических заявок
	 */
	async createPeriodSubmissions(
		data: CreatePeriodSubmissionsRequest
	): Promise<PeriodSubmissionsResponse> {
		const response = await api.post<PeriodSubmissionsResponse>(
			`/api/submissions/period`,
			data
		)
		return response.data
	}

	/**
	 * Получение информации о группе периода
	 */
	async getPeriodGroup(periodGroupId: string): Promise<PeriodGroupResponse> {
		const response = await api.get<PeriodGroupResponse>(
			`/api/submissions/period/${periodGroupId}`
		)
		return response.data
	}

	/**
	 * Получение всех заявок периода
	 */
	async getPeriodSubmissions(periodGroupId: string): Promise<any> {
		const response = await api.get(
			`/api/submissions/period/${periodGroupId}/submissions`
		)
		return response.data
	}

	/**
	 * Отмена группы периода
	 */
	async cancelPeriodGroup(periodGroupId: string): Promise<any> {
		const response = await api.post(
			`/api/submissions/period/${periodGroupId}/cancel`
		)
		return response.data
	}

	/**
	 * Обновление группы периода
	 */
	async updatePeriodGroup(
		periodGroupId: string,
		updates: Record<string, any>
	): Promise<any> {
		const response = await api.patch(
			`/api/submissions/period/${periodGroupId}`,
			{ updates }
		)
		return response.data
	}
}

export const periodSubmissionService = new PeriodSubmissionService()
