import api from './api'
import { User } from '../types/user'

interface LoginCredentials {
	email: string
	password: string
}

interface LoginResponse {
	user: User
	token: string
}

export const authService = {
	async login(credentials: LoginCredentials): Promise<LoginResponse> {
		try {
			const response = await api.post('/api/auth/user-login', credentials)
			return response.data
		} catch (error: any) {
			throw new Error(error.response?.data?.message || 'Ошибка авторизации')
		}
	},

	async validateToken(token: string): Promise<boolean> {
		try {
			const response = await api.get('/api/auth/check', {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})
			return response.status === 200 && response.data.success
		} catch (error) {
			return false
		}
	},

	async logout(): Promise<void> {
		try {
			await api.post('/api/auth/logout')
		} catch (error) {
			// Игнорируем ошибки при выходе
		}
	},
}
