import axios from 'axios'

// В режиме разработки используем прокси (относительные пути)
// В продакшене используем полный URL
const API_URL =
	process.env.NODE_ENV === 'production'
		? process.env.REACT_APP_API_URL || 'http://localhost:5001'
		: '' // Пустая строка для использования прокси в разработке

const api = axios.create({
	baseURL: API_URL,
	timeout: 10000,
	headers: {
		'Content-Type': 'application/json',
	},
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

// Интерцептор для обработки ответов
api.interceptors.response.use(
	response => response,
	async error => {
		const originalRequest = error.config

		if (error.response?.status === 401 && !originalRequest._retry) {
			originalRequest._retry = true

			// Очищаем токены
			localStorage.removeItem('token')
			localStorage.removeItem('refreshToken')
			localStorage.removeItem('user')

			// Перенаправляем на страницу входа
			window.location.href = '/login'

			return Promise.reject(error)
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
