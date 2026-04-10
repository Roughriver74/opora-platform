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

// Добавляем перехватчик для обработки ошибок
api.interceptors.response.use(
	response => response,
	error => {
		// Обработка ошибок таймаута
		if (
			error.code === 'ECONNABORTED' &&
			error.message &&
			error.message.includes('timeout')
		) {
			console.error(
				'API запрос превысил время ожидания. Проверьте, запущен ли сервер API.'
			)
			// Можно добавить дополнительную логику для повторных попыток или уведомления пользователя
		}

		// Если ошибка 401 (Unauthorized), перенаправляем на страницу входа
		if (error.response && error.response.status === 401) {
			localStorage.removeItem('token')
			localStorage.removeItem('token_expires_at')
			window.location.href = '/auth'
		}
		return Promise.reject(error)
	}
)
