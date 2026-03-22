import api from './api'
import { Visit, VisitFilters, CreateVisitData, UpdateVisitData, VisitStatus } from '../types/visit'

export const visitService = {
	async getVisits(filters?: VisitFilters): Promise<{ data: Visit[]; total: number; page: number; limit: number }> {
		const response = await api.get('/api/visits', { params: filters })
		return response.data
	},

	async getVisitById(id: string): Promise<Visit> {
		const response = await api.get(`/api/visits/${id}`)
		return response.data
	},

	async getCalendar(dateFrom: string, dateTo: string): Promise<Visit[]> {
		const response = await api.get('/api/visits/calendar', { params: { dateFrom, dateTo } })
		return response.data
	},

	async createVisit(data: CreateVisitData): Promise<Visit> {
		const response = await api.post('/api/visits', data)
		return response.data
	},

	async updateVisit(id: string, data: UpdateVisitData): Promise<Visit> {
		const response = await api.put(`/api/visits/${id}`, data)
		return response.data
	},

	async updateStatus(id: string, status: VisitStatus): Promise<Visit> {
		const response = await api.patch(`/api/visits/${id}/status`, { status })
		return response.data
	},

	async deleteVisit(id: string): Promise<void> {
		await api.delete(`/api/visits/${id}`)
	},
}
