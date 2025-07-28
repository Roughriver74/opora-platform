import api from './api'

export interface User {
	_id: string
	firstName: string
	lastName: string
	email: string
	role: 'admin' | 'user'
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

	async updateUser(id: string, updates: Partial<User>): Promise<User> {
		const response = await api.put(`/api/users/${id}`, updates)
		return response.data
	}

	async deleteUser(id: string): Promise<void> {
		await api.delete(`/api/users/${id}`)
	}

	async createUser(
		userData: Omit<User, '_id' | 'createdAt' | 'updatedAt'>
	): Promise<User> {
		const response = await api.post('/api/users', userData)
		return response.data
	}
}

export const UserService = new UserServiceClass()
export default UserService
