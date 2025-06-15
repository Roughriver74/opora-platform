import React, {
	createContext,
	useContext,
	useReducer,
	useCallback,
	useEffect,
} from 'react'
import {
	AuthContextType,
	AuthState,
	LoginCredentials,
	AuthTokens,
} from './types'

// Начальное состояние
const initialState: AuthState = {
	isAuthenticated: false,
	user: null,
	isLoading: true,
	error: null,
}

// Actions для reducer
type AuthAction =
	| { type: 'AUTH_START' }
	| { type: 'AUTH_SUCCESS'; payload: { user: any } }
	| { type: 'AUTH_FAILURE'; payload: { error: string } }
	| { type: 'AUTH_LOGOUT' }
	| { type: 'CLEAR_ERROR' }
	| { type: 'SET_LOADING'; payload: boolean }

// Reducer для управления состоянием
function authReducer(state: AuthState, action: AuthAction): AuthState {
	console.log('AuthReducer action:', action.type, action)

	switch (action.type) {
		case 'AUTH_START':
			return {
				...state,
				isLoading: true,
				error: null,
			}
		case 'AUTH_SUCCESS':
			console.log('Auth success with user:', action.payload.user)
			return {
				...state,
				isAuthenticated: true,
				user: action.payload.user,
				isLoading: false,
				error: null,
			}
		case 'AUTH_FAILURE':
			console.log('Auth failure with error:', action.payload.error)
			return {
				...state,
				isAuthenticated: false,
				user: null,
				isLoading: false,
				error: action.payload.error,
			}
		case 'AUTH_LOGOUT':
			console.log('Auth logout')
			return {
				...state,
				isAuthenticated: false,
				user: null,
				isLoading: false,
				error: null,
			}
		case 'CLEAR_ERROR':
			return {
				...state,
				error: null,
			}
		case 'SET_LOADING':
			return {
				...state,
				isLoading: action.payload,
			}
		default:
			return state
	}
}

// Создаем контекст
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Хук для использования контекста
export const useAuth = (): AuthContextType => {
	const context = useContext(AuthContext)
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider')
	}
	return context
}

// Провайдер контекста
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [state, dispatch] = useReducer(authReducer, initialState)

	// Утилита для работы с токенами в localStorage
	const getTokens = (): AuthTokens | null => {
		try {
			const tokens = localStorage.getItem('auth_tokens')
			return tokens ? JSON.parse(tokens) : null
		} catch {
			return null
		}
	}

	const setTokens = (tokens: AuthTokens): void => {
		localStorage.setItem('auth_tokens', JSON.stringify(tokens))
	}

	const clearTokens = (): void => {
		localStorage.removeItem('auth_tokens')
	}

	// Проверка текущего токена при загрузке приложения
	const checkAuth = useCallback(async (): Promise<void> => {
		const tokens = getTokens()

		if (!tokens) {
			dispatch({ type: 'SET_LOADING', payload: false })
			return
		}

		try {
			const response = await fetch('/api/auth/verify', {
				headers: {
					Authorization: `Bearer ${tokens.accessToken}`,
				},
			})

			if (response.ok) {
				const data = await response.json()
				dispatch({
					type: 'AUTH_SUCCESS',
					payload: {
						user: {
							role: 'admin', // Пока что только админы
						},
					},
				})
			} else {
				clearTokens()
				dispatch({ type: 'AUTH_LOGOUT' })
			}
		} catch (error) {
			console.error('Ошибка проверки авторизации:', error)
			clearTokens()
			dispatch({ type: 'AUTH_LOGOUT' })
		}
	}, [])

	// Вход в систему
	const login = async (credentials: LoginCredentials): Promise<boolean> => {
		dispatch({ type: 'AUTH_START' })

		try {
			const response = await fetch('/api/auth/admin-login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ password: credentials.password }),
			})

			const data = await response.json()

			if (response.ok && data.success) {
				const tokens: AuthTokens = {
					accessToken: data.token,
					refreshToken: data.token, // Используем тот же токен
					expiresIn: data.expiresIn,
				}

				setTokens(tokens)
				dispatch({
					type: 'AUTH_SUCCESS',
					payload: {
						user: {
							role: 'admin',
							email: credentials.email,
							fullName: 'Администратор',
						},
					},
				})
				return true
			} else {
				dispatch({
					type: 'AUTH_FAILURE',
					payload: { error: data.message || 'Ошибка авторизации' },
				})
				return false
			}
		} catch (error) {
			dispatch({
				type: 'AUTH_FAILURE',
				payload: { error: 'Ошибка сети' },
			})
			return false
		}
	}

	// Обновление токена (не используется в админской авторизации)
	const refreshToken = async (): Promise<boolean> => {
		return false
	}

	// Выход из системы
	const logout = async (): Promise<void> => {
		const tokens = getTokens()

		try {
			await fetch('/api/auth/logout', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: tokens ? `Bearer ${tokens.accessToken}` : '',
				},
			})
		} catch (error) {
			console.error('Ошибка при выходе:', error)
		}

		clearTokens()
		dispatch({ type: 'AUTH_LOGOUT' })
	}

	// Очистка ошибки
	const clearError = (): void => {
		dispatch({ type: 'CLEAR_ERROR' })
	}

	// Проверяем авторизацию при загрузке
	useEffect(() => {
		checkAuth()
	}, [checkAuth])

	const value: AuthContextType = {
		...state,
		login,
		logout,
		refreshToken,
		clearError,
	}

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
