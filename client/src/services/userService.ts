import api from './api'

export interface User {
	_id: string
	id?: string
	firstName: string
	lastName: string
	email: string
	role: 'admin' | 'user'
	isActive?: boolean
	phone?: string
	bitrixUserId?: string
	bitrix_id?: string
	createdAt: string
	updatedAt: string
}

export interface GetUsersResponse {
	success: boolean
	data: User[]
}

class UserServiceClass {
	async getUsers(): Promise<GetUsersResponse> {
		const response = await api.get('/api/users')
		return response.data
	}

	async getAllUsers(): Promise<User[]> {
		const response = await api.get('/api/users')
		return response.data.data || response.data
	}

	async updateUser(id: string, updates: Partial<User> & { password?: string }): Promise<User> {
		const response = await api.put(`/api/users/${id}`, updates)
		return response.data.data || response.data
	}

	async deleteUser(id: string): Promise<void> {
		await api.delete(`/api/users/${id}`)
	}

	async createUser(
		userData: Omit<User, '_id' | 'id' | 'createdAt' | 'updatedAt'> & { password: string }
	): Promise<User> {
		const response = await api.post('/api/users', userData)
		return response.data.data || response.data
	}
}

export const UserService = new UserServiceClass()
export default UserService
