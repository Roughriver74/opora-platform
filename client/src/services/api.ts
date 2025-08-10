import axios from 'axios'

// В продакшене nginx проксирует запросы, поэтому используем относительные пути
// В разработке используем прямой URL к backend
const API_URL =
	process.env.NODE_ENV === 'production'
		? '' // Пустой baseURL для использования относительных путей через nginx proxy
		: 'http://localhost:5001' // Прямой URL для разработки

const api = axios.create({
	baseURL: API_URL,
	timeout: 30000, // Увеличиваем timeout до 30 секунд для Bitrix24 запросов
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
		// Перезагружаем страницу, чтобы приложение показало форму входа
		window.location.reload()
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

				// Перезагружаем страницу, чтобы приложение показало форму входа
				window.location.reload()
			}
		}

		return Promise.reject(error)
	}
)

export default api
