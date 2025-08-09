import api from './api'
import { User } from '../types/user'

interface LoginCredentials {
	email: string
	password: string
}

interface LoginResponse {
	success: boolean
	accessToken: string
	refreshToken: string
	expiresIn: string
	user: User
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
			// Пробуем проверить токен
			const response = await api.get('/api/auth/check')
			return response.status === 200 && response.data.success
		} catch (error: any) {
			// Если ошибка 401, интерцептор автоматически попытается обновить токен
			// Если обновление не удалось, пользователь будет разлогинен
			console.error('Token validation error:', error)
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
