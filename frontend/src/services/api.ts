import axios from 'axios'

// Определяем базовый URL в зависимости от окружения
const getBaseUrl = () => {
	// В production режиме API доступен по относительному пути
	if (process.env.NODE_ENV === 'production') {
		return '/api'
	}
	// В режиме разработки используем переменную окружения или localhost
	return process.env.REACT_APP_API_URL || 'http://localhost:8000/api'
}

// Конфигурация API в зависимости от окружения
const apiConfig = {
	baseURL: getBaseUrl(),
	headers: {
		'Content-Type': 'application/json',
	},
	// Увеличиваем таймаут по умолчанию до 30 секунд
	timeout: process.env.NODE_ENV === 'production' ? 15000 : 30000,
}

// Создаем экземпляр axios с базовым URL
export const api = axios.create(apiConfig)

// Добавляем перехватчик для добавления токена авторизации
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

// Состояние процесса обновления токена
let isRefreshing = false
let failedQueue: Array<{ resolve: Function; reject: Function }> = []

const processQueue = (error: any, token: string | null = null) => {
	failedQueue.forEach(prom => {
		if (error) {
			prom.reject(error)
		} else {
			prom.resolve(token)
		}
	})
	failedQueue = []
}

// Добавляем перехватчик для обработки ошибок
api.interceptors.response.use(
	response => response,
	async error => {
		// Обработка ошибок таймаута
		if (
			error.code === 'ECONNABORTED' &&
			error.message &&
			error.message.includes('timeout')
		) {
			console.error(
				'API запрос превысил время ожидания. Проверьте, запущен ли сервер API.'
			)
		}

		const originalRequest = error.config

		// Если ошибка 401 (Unauthorized) — пробуем обновить токен
		if (error.response?.status === 401 && !originalRequest._retry) {
			if (isRefreshing) {
				// Если обновление уже идёт — ставим запрос в очередь
				return new Promise((resolve, reject) => {
					failedQueue.push({ resolve, reject })
				})
					.then(token => {
						originalRequest.headers['Authorization'] = `Bearer ${token}`
						return api(originalRequest)
					})
					.catch(err => Promise.reject(err))
			}

			originalRequest._retry = true
			isRefreshing = true

			const refreshToken = localStorage.getItem('refresh_token')

			if (!refreshToken) {
				// Нет refresh token — выходим
				localStorage.removeItem('token')
				localStorage.removeItem('refresh_token')
				localStorage.removeItem('token_expires_at')
				window.location.href = '/auth'
				return Promise.reject(error)
			}

			try {
				const response = await api.post('/auth/refresh', { refresh_token: refreshToken })
				const { access_token, refresh_token: newRefreshToken } = response.data

				localStorage.setItem('token', access_token)
				if (newRefreshToken) {
					localStorage.setItem('refresh_token', newRefreshToken)
				}

				api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
				originalRequest.headers['Authorization'] = `Bearer ${access_token}`

				processQueue(null, access_token)
				return api(originalRequest)
			} catch (refreshError) {
				processQueue(refreshError, null)
				localStorage.removeItem('token')
				localStorage.removeItem('refresh_token')
				localStorage.removeItem('token_expires_at')
				window.location.href = '/auth'
				return Promise.reject(refreshError)
			} finally {
				isRefreshing = false
			}
		}

		return Promise.reject(error)
	}
)
