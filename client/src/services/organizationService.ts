import api from './api'
import {
	Organization,
	OrganizationMember,
	CreateOrganizationData,
	AddMemberData,
} from '../types/organization'

export const organizationService = {
	async getAll(): Promise<Organization[]> {
		const response = await api.get('/api/organizations')
		return response.data.data || response.data
	},

	async create(data: CreateOrganizationData): Promise<Organization> {
		const response = await api.post('/api/organizations', data)
		return response.data.data || response.data
	},

	async getMembers(orgId: string): Promise<OrganizationMember[]> {
		const response = await api.get(`/api/organizations/${orgId}/members`)
		return response.data.data || response.data
	},

	async addMember(orgId: string, data: AddMemberData): Promise<OrganizationMember> {
		const response = await api.post(`/api/organizations/${orgId}/members`, data)
		return response.data.data || response.data
	},

	async removeMember(orgId: string, userId: string): Promise<void> {
		await api.delete(`/api/organizations/${orgId}/members/${userId}`)
	},

	async selectOrganization(orgId: string): Promise<{
		accessToken: string
		refreshToken: string
		user: any
		currentOrganization: any
	}> {
		const response = await api.post('/api/auth/select-organization', {
			organizationId: orgId,
		})
		return response.data
	},
}
