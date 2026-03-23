import api from './api'
import { User } from '../types/user'

interface LoginCredentials {
	email: string
	password: string
}

interface RegisterCredentials {
	email: string
	password: string
	firstName?: string
	lastName?: string
}

interface LoginResponse {
	success: boolean
	accessToken: string
	refreshToken: string
	expiresIn: string
	user: User
}

interface SocialAuthResponse {
	success: boolean
	url: string
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

	async register(credentials: RegisterCredentials): Promise<LoginResponse> {
		try {
			const response = await api.post('/api/auth/register', credentials)
			return response.data
		} catch (error: any) {
			throw new Error(error.response?.data?.message || 'Ошибка регистрации')
		}
	},

	async getSocialAuthUrl(provider: string): Promise<string> {
		try {
			const response = await api.get<SocialAuthResponse>(`/api/auth/social/${provider}`)
			return response.data.url
		} catch (error: any) {
			throw new Error(error.response?.data?.message || `Ошибка авторизации через ${provider}`)
		}
	},

	async validateToken(token: string): Promise<boolean> {
		try {
			const response = await api.get('/api/auth/check')
			return response.status === 200 && response.data.success
		} catch (error: any) {
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
