import React, { createContext, useContext, useReducer, ReactNode } from 'react'
import { authService } from '../../services/authService'
import { organizationService } from '../../services/organizationService'
import { User } from '../../types/user'
import { OrganizationInfo } from '../../types/organization'

// Типы для состояния аутентификации
interface AuthState {
	user: User | null
	isLoading: boolean
	error: string | null
	isAuthenticated: boolean
	currentOrganization: OrganizationInfo | null
	organizations: OrganizationInfo[]
	needsOrganizationSelection: boolean
}

// Типы для действий
type AuthAction =
	| { type: 'AUTH_START' }
	| { type: 'AUTH_SUCCESS'; payload: { user: User; token: string } }
	| { type: 'AUTH_FAILURE'; payload: { error: string } }
	| { type: 'AUTH_LOGOUT' }
	| { type: 'SET_LOADING'; payload: boolean }
	| { type: 'CLEAR_ERROR' }
	| {
			type: 'SET_ORGANIZATIONS'
			payload: {
				organizations: OrganizationInfo[]
				needsSelection: boolean
			}
	  }
	| {
			type: 'SET_CURRENT_ORGANIZATION'
			payload: OrganizationInfo
	  }

// Начальное состояние
const initialState: AuthState = {
	user: null,
	isLoading: true,
	error: null,
	isAuthenticated: false,
	currentOrganization: null,
	organizations: [],
	needsOrganizationSelection: false,
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
				currentOrganization: null,
				organizations: [],
				needsOrganizationSelection: false,
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
		case 'SET_ORGANIZATIONS':
			return {
				...state,
				organizations: action.payload.organizations,
				needsOrganizationSelection: action.payload.needsSelection,
			}
		case 'SET_CURRENT_ORGANIZATION':
			return {
				...state,
				currentOrganization: action.payload,
				needsOrganizationSelection: false,
			}
		default:
			return state
	}
}

// Интерфейс для контекста
interface AuthContextType {
	user: User | null
	isLoading: boolean
	error: string | null
	isAuthenticated: boolean
	currentOrganization: OrganizationInfo | null
	organizations: OrganizationInfo[]
	needsOrganizationSelection: boolean
	login: (credentials: { email: string; password: string }) => Promise<boolean>
	logout: () => void
	clearError: () => void
	checkAuth: () => Promise<boolean>
	selectOrganization: (orgId: string) => Promise<void>
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

	// Функция для входа в систему
	const login = async (credentials: {
		email: string
		password: string
	}): Promise<boolean> => {
		try {
			dispatch({ type: 'AUTH_START' })

			const data = await authService.login(credentials)

			// Сохраняем данные пользователя и токены
			localStorage.setItem('user', JSON.stringify(data.user))
			localStorage.setItem('token', data.accessToken)
			localStorage.setItem('refreshToken', data.refreshToken)

			dispatch({
				type: 'AUTH_SUCCESS',
				payload: { user: data.user, token: data.accessToken },
			})

			// Проверяем наличие организаций в ответе
			const responseData = data as any
			if (
				responseData.organizations &&
				Array.isArray(responseData.organizations)
			) {
				const orgs: OrganizationInfo[] = responseData.organizations

				if (responseData.needsOrganizationSelection && orgs.length > 1) {
					// Нужно выбрать организацию
					dispatch({
						type: 'SET_ORGANIZATIONS',
						payload: {
							organizations: orgs,
							needsSelection: true,
						},
					})
				} else if (orgs.length === 1) {
					// Одна организация — выбираем автоматически
					dispatch({
						type: 'SET_CURRENT_ORGANIZATION',
						payload: orgs[0],
					})
					localStorage.setItem(
						'currentOrganization',
						JSON.stringify(orgs[0])
					)
				} else if (orgs.length > 1) {
					// Несколько организаций, но сервер уже выбрал
					dispatch({
						type: 'SET_ORGANIZATIONS',
						payload: { organizations: orgs, needsSelection: false },
					})
				}

				// Если сервер уже прислал текущую организацию
				if (responseData.currentOrganization) {
					dispatch({
						type: 'SET_CURRENT_ORGANIZATION',
						payload: responseData.currentOrganization,
					})
					localStorage.setItem(
						'currentOrganization',
						JSON.stringify(responseData.currentOrganization)
					)
				}
			}

			return true
		} catch (error: any) {
			dispatch({
				type: 'AUTH_FAILURE',
				payload: { error: error.message || 'Ошибка входа в систему' },
			})
			return false
		}
	}

	// Функция для выбора организации
	const selectOrganization = async (orgId: string): Promise<void> => {
		try {
			dispatch({ type: 'SET_LOADING', payload: true })

			const data = await organizationService.selectOrganization(orgId)

			// Обновляем токены
			if (data.accessToken) {
				localStorage.setItem('token', data.accessToken)
			}
			if (data.refreshToken) {
				localStorage.setItem('refreshToken', data.refreshToken)
			}
			if (data.user) {
				localStorage.setItem('user', JSON.stringify(data.user))
				dispatch({
					type: 'AUTH_SUCCESS',
					payload: { user: data.user, token: data.accessToken },
				})
			}

			// Устанавливаем текущую организацию
			const org =
				data.currentOrganization ||
				state.organizations.find(o => o.id === orgId)
			if (org) {
				dispatch({ type: 'SET_CURRENT_ORGANIZATION', payload: org })
				localStorage.setItem('currentOrganization', JSON.stringify(org))
			}
		} catch (error: any) {
			dispatch({
				type: 'AUTH_FAILURE',
				payload: {
					error:
						error.message || 'Ошибка при выборе организации',
				},
			})
		} finally {
			dispatch({ type: 'SET_LOADING', payload: false })
		}
	}

	// Функция для выхода из системы
	const logout = () => {
		localStorage.removeItem('user')
		localStorage.removeItem('token')
		localStorage.removeItem('refreshToken')
		localStorage.removeItem('currentOrganization')
		dispatch({ type: 'AUTH_LOGOUT' })
	}

	// Функция для очистки ошибки
	const clearError = () => {
		dispatch({ type: 'CLEAR_ERROR' })
	}

	// Функция для проверки аутентификации
	const checkAuth = async (): Promise<boolean> => {
		try {
			const token = localStorage.getItem('token')
			const userStr = localStorage.getItem('user')

			if (!token || !userStr) {
				dispatch({ type: 'SET_LOADING', payload: false })
				return false
			}

			const user = JSON.parse(userStr)

			// Проверяем токен только если он не истек
			const tokenExp = JSON.parse(atob(token.split('.')[1])).exp
			const now = Date.now() / 1000

			if (tokenExp < now) {
				localStorage.removeItem('user')
				localStorage.removeItem('token')
				localStorage.removeItem('refreshToken')
				localStorage.removeItem('currentOrganization')
				dispatch({ type: 'AUTH_LOGOUT' })
				return false
			}

			// Токен валиден — устанавливаем пользователя
			dispatch({
				type: 'AUTH_SUCCESS',
				payload: { user, token },
			})

			// Восстанавливаем данные организации из localStorage
			const orgStr = localStorage.getItem('currentOrganization')
			if (orgStr) {
				try {
					const org = JSON.parse(orgStr)
					dispatch({ type: 'SET_CURRENT_ORGANIZATION', payload: org })
				} catch {
					// Если данные организации повреждены — игнорируем
				}
			}

			return true
		} catch (error) {
			console.error('Ошибка проверки авторизации:', error)
			localStorage.removeItem('user')
			localStorage.removeItem('token')
			localStorage.removeItem('refreshToken')
			localStorage.removeItem('currentOrganization')
			dispatch({ type: 'AUTH_LOGOUT' })
			return false
		} finally {
			dispatch({ type: 'SET_LOADING', payload: false })
		}
	}

	const contextValue: AuthContextType = {
		user: state.user,
		isLoading: state.isLoading,
		error: state.error,
		isAuthenticated: state.isAuthenticated,
		currentOrganization: state.currentOrganization,
		organizations: state.organizations,
		needsOrganizationSelection: state.needsOrganizationSelection,
		login,
		logout,
		clearError,
		checkAuth,
		selectOrganization,
	}

	return (
		<AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
	)
}
