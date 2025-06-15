import axios from 'axios'

// Базовый URL для API
// В development используем полный URL к серверу, в production - относительный путь
const API_URL =
	process.env.NODE_ENV === 'development'
		? process.env.REACT_APP_API_URL || 'http://localhost:5001/api'
		: process.env.REACT_APP_API_URL || '/api'

console.log('Using API URL:', API_URL) // Для отладки

// Создание экземпляра axios с базовым URL
const api = axios.create({
	baseURL: API_URL,
	headers: {
		'Content-Type': 'application/json',
	},
})

// Интерцептор для добавления токена авторизации к запросам
api.interceptors.request.use(
	config => {
		// Получаем токены из правильного места в localStorage
		try {
			const tokens = localStorage.getItem('auth_tokens')
			if (tokens) {
				const parsedTokens = JSON.parse(tokens)
				if (parsedTokens.accessToken) {
					config.headers['Authorization'] = `Bearer ${parsedTokens.accessToken}`
				}
			}
		} catch (error) {
			console.error('Ошибка при получении токена:', error)
		}
		return config
	},
	error => {
		return Promise.reject(error)
	}
)

// Интерцептор для обработки ошибок аутентификации
api.interceptors.response.use(
	response => response,
	error => {
		// Если сервер вернул 401 Unauthorized, проверяем причину
		if (error.response && error.response.status === 401) {
			const errorMessage = error.response.data?.message || ''

			// Разлогиниваем только если токен недействителен или истек
			if (
				errorMessage.includes('недействителен') ||
				errorMessage.includes('истек') ||
				errorMessage.includes('отсутствует') ||
				errorMessage.includes('invalid token') ||
				errorMessage.includes('expired')
			) {
				console.log('Token expired or invalid, clearing tokens')
				localStorage.removeItem('auth_tokens')
				// Перезагружаем страницу для принудительного выхода
				window.location.reload()
			} else {
				// Для других ошибок 401 (например, недостаток прав) - просто логируем
				console.log('Access denied, but token is valid:', errorMessage)
			}
		}
		return Promise.reject(error)
	}
)

export default api
