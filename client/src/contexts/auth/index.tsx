import React, { createContext, useContext, useReducer, ReactNode } from 'react'
import { authService } from '../../services/authService'
import { User } from '../../types/user'

// Типы для состояния аутентификации
interface AuthState {
	user: User | null
	isLoading: boolean
	error: string | null
	isAuthenticated: boolean
}

// Типы для действий
type AuthAction =
	| { type: 'AUTH_START' }
	| { type: 'AUTH_SUCCESS'; payload: { user: User; token: string } }
	| { type: 'AUTH_FAILURE'; payload: { error: string } }
	| { type: 'AUTH_LOGOUT' }
	| { type: 'SET_LOADING'; payload: boolean }
	| { type: 'CLEAR_ERROR' }

// Начальное состояние
const initialState: AuthState = {
	user: null,
	isLoading: true, // Изначально true, чтобы показать загрузку при проверке токена
	error: null,
	isAuthenticated: false,
}

// Редьюсер для управления состоянием
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
	switch (action.type) {
		case 'AUTH_START':
			return {
				...state,
				isLoading: true,
				error: null,
			}
		case 'AUTH_SUCCESS':
			return {
				...state,
				isLoading: false,
				user: action.payload.user,
				isAuthenticated: true,
				error: null,
			}
		case 'AUTH_FAILURE':
			return {
				...state,
				isLoading: false,
				error: action.payload.error,
				isAuthenticated: false,
			}
		case 'AUTH_LOGOUT':
			return {
				...state,
				user: null,
				isAuthenticated: false,
				error: null,
			}
		case 'SET_LOADING':
			return {
				...state,
				isLoading: action.payload,
			}
		case 'CLEAR_ERROR':
			return {
				...state,
				error: null,
			}
		default:
			return state
	}
}

// Интерфейс для контекста - изменяю чтобы свойства были доступны напрямую
interface AuthContextType {
	user: User | null
	isLoading: boolean
	error: string | null
	isAuthenticated: boolean
	login: (credentials: { email: string; password: string }) => Promise<boolean>
	logout: () => void
	clearError: () => void
	checkAuth: () => Promise<boolean>
}

// Создание контекста
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Хук для использования контекста
export const useAuth = (): AuthContextType => {
	const context = useContext(AuthContext)
	if (!context) {
		throw new Error('useAuth must be used within an AuthProvider')
	}
	return context
}

// Провайдер контекста
interface AuthProviderProps {
	children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
	const [state, dispatch] = useReducer(authReducer, initialState)

	// Функция для входа в систему - возвращаю boolean
	const login = async (credentials: {
		email: string
		password: string
	}): Promise<boolean> => {
		try {
			dispatch({ type: 'AUTH_START' })

			const data = await authService.login(credentials)

			// Сохраняем данные пользователя и токены
			// Сервер возвращает accessToken и refreshToken
			localStorage.setItem('user', JSON.stringify(data.user))
			localStorage.setItem('token', data.accessToken)
			localStorage.setItem('refreshToken', data.refreshToken)

			dispatch({
				type: 'AUTH_SUCCESS',
				payload: { user: data.user, token: data.accessToken },
			})

			return true
		} catch (error: any) {
			dispatch({
				type: 'AUTH_FAILURE',
				payload: { error: error.message || 'Ошибка входа в систему' },
			})
			return false
		}
	}

	// Функция для выхода из системы
	const logout = () => {
		localStorage.removeItem('user')
		localStorage.removeItem('token')
		localStorage.removeItem('refreshToken')
		dispatch({ type: 'AUTH_LOGOUT' })
	}

	// Функция для очистки ошибки
	const clearError = () => {
		dispatch({ type: 'CLEAR_ERROR' })
	}

	// Функция для проверки аутентификации
	const checkAuth = async (): Promise<boolean> => {
		console.log('🔵 checkAuth called')
		try {
			const token = localStorage.getItem('token')
			const userStr = localStorage.getItem('user')

			console.log(
				'🔵 checkAuth: token exists:',
				!!token,
				'user exists:',
				!!userStr
			)

			if (!token || !userStr) {
				// Если нет токена, просто устанавливаем isLoading в false
				console.log(
					'🔵 checkAuth: no token or user, setting isLoading to false'
				)
				dispatch({ type: 'SET_LOADING', payload: false })
				return false
			}

			// Если токен есть, начинаем проверку
			const user = JSON.parse(userStr)

			// Проверяем токен только если он не истек (базовая проверка)
			const tokenExp = JSON.parse(atob(token.split('.')[1])).exp
			const now = Date.now() / 1000

			console.log(
				'🔵 checkAuth: token exp:',
				tokenExp,
				'now:',
				now,
				'valid:',
				tokenExp >= now
			)

			if (tokenExp < now) {
				// Токен истек - очищаем данные
				console.log('🔵 checkAuth: token expired, clearing data')
				localStorage.removeItem('user')
				localStorage.removeItem('token')
				localStorage.removeItem('refreshToken')
				dispatch({ type: 'AUTH_LOGOUT' })
				return false
			}

			// Токен валиден - устанавливаем пользователя
			console.log('🔵 checkAuth: token valid, setting user:', user.email)
			dispatch({
				type: 'AUTH_SUCCESS',
				payload: { user, token },
			})
			return true
		} catch (error) {
			console.error('🔵 checkAuth error:', error)
			// При ошибке очищаем данные
			localStorage.removeItem('user')
			localStorage.removeItem('token')
			localStorage.removeItem('refreshToken')
			dispatch({ type: 'AUTH_LOGOUT' })
			return false
		} finally {
			console.log('🔵 checkAuth: setting isLoading to false')
			dispatch({ type: 'SET_LOADING', payload: false })
		}
	}

	// Предоставляю свойства напрямую вместо объекта state
	const contextValue: AuthContextType = {
		user: state.user,
		isLoading: state.isLoading,
		error: state.error,
		isAuthenticated: state.isAuthenticated,
		login,
		logout,
		clearError,
		checkAuth,
	}

	return (
		<AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
	)
}
