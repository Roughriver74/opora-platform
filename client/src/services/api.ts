import axios from 'axios'

// В режиме разработки используем прокси (относительные пути)
// В продакшене используем полный URL
const API_URL =
	process.env.NODE_ENV === 'production'
		? process.env.REACT_APP_API_URL || 'http://localhost:5001'
		: 'http://localhost:5001' // Используем прямой URL для разработки

const api = axios.create({
	baseURL: API_URL,
	timeout: 10000,
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

// Функция для обновления токена
const refreshAccessToken = async () => {
	try {
		const refreshToken = localStorage.getItem('refreshToken')
		if (!refreshToken) {
			throw new Error('No refresh token')
		}

		const response = await axios.post(`${API_URL}/api/auth/refresh`, {
			refreshToken,
		})

		if (response.data.success) {
			localStorage.setItem('token', response.data.accessToken)
			localStorage.setItem('refreshToken', response.data.refreshToken)
			return response.data.accessToken
		} else {
			throw new Error('Refresh failed')
		}
	} catch (error) {
		// При ошибке обновления токена - выходим
		localStorage.removeItem('token')
		localStorage.removeItem('refreshToken')
		localStorage.removeItem('user')
		window.location.href = '/login'
		throw error
	}
}

// Интерцептор для обработки ответов
api.interceptors.response.use(
	response => response,
	async error => {
		const originalRequest = error.config

		// Если ошибка 401 и это не повторный запрос
		if (error.response?.status === 401 && !originalRequest._retry) {
			originalRequest._retry = true

			try {
				// Пытаемся обновить токен
				const newToken = await refreshAccessToken()
				
				// Обновляем заголовок авторизации
				originalRequest.headers.Authorization = `Bearer ${newToken}`
				
				// Повторяем оригинальный запрос
				return api(originalRequest)
			} catch (refreshError) {
				// Если обновление не удалось, редирект уже выполнен в refreshAccessToken
				return Promise.reject(refreshError)
			}
		}

		// Обработка других ошибок
		if (error.response?.status === 403) {
			const errorMessage = error.response.data?.error || 'Доступ запрещен'

			// Проверяем, истек ли токен
			if (
				errorMessage.includes('Token expired') ||
				errorMessage.includes('invalid')
			) {
				// Очищаем все токены
				localStorage.removeItem('token')
				localStorage.removeItem('refreshToken')
				localStorage.removeItem('user')

				// Перенаправляем на страницу входа
				window.location.href = '/login'
			}
		}

		return Promise.reject(error)
	}
)

export default api
