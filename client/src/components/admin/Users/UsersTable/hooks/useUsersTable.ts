import { useState, useEffect, useCallback } from 'react'
import { apiService } from '../../../../../services/apiService'
import {
	User,
	UsersFilter,
	UsersPagination,
	UsersResponse,
} from '../../../../../types/user'

export interface UseUsersTableReturn {
	users: User[]
	loading: boolean
	error: string | null
	pagination: UsersPagination
	filters: UsersFilter
	handleSearchChange: (search: string) => void
	handleRoleFilterChange: (role: string) => void
	handleStatusFilterChange: (status: string) => void
	handlePageChange: (event: React.ChangeEvent<unknown>, page: number) => void
	refreshUsers: () => void
}

export const useUsersTable = (): UseUsersTableReturn => {
	const [users, setUsers] = useState<User[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const [pagination, setPagination] = useState<UsersPagination>({
		page: 1,
		limit: 100,
		total: 0,
		pages: 0,
	})

	const [filters, setFilters] = useState<UsersFilter>({
		search: '',
		role: '',
		status: '',
	})

	// Загрузка пользователей
	const loadUsers = useCallback(async () => {
		setLoading(true)
		setError(null)

		try {
			const queryParams = new URLSearchParams()
			queryParams.append('page', pagination.page.toString())
			queryParams.append('limit', pagination.limit.toString())

			if (filters.search) {
				queryParams.append('search', filters.search)
			}
			if (filters.role) {
				queryParams.append('role', filters.role)
			}
			if (filters.status) {
				queryParams.append('status', filters.status)
			}

			const response = await apiService.get(`/api/users?${queryParams.toString()}`)
			const data: UsersResponse = response.data

			if (data.success) {
				setUsers(data.data)
				setPagination(data.pagination)
			} else {
				setError('Не удалось загрузить пользователей')
			}
		} catch (err: any) {
			console.error('Ошибка загрузки пользователей:', err)
			setError(err.response?.data?.message || 'Ошибка загрузки пользователей')
		} finally {
			setLoading(false)
		}
	}, [pagination.page, pagination.limit, filters])

	// Обработчики фильтров
	const handleSearchChange = useCallback((search: string) => {
		setFilters(prev => ({ ...prev, search }))
		setPagination(prev => ({ ...prev, page: 1 })) // Сбрасываем на первую страницу
	}, [])

	const handleRoleFilterChange = useCallback((role: string) => {
		setFilters(prev => ({ ...prev, role }))
		setPagination(prev => ({ ...prev, page: 1 }))
	}, [])

	const handleStatusFilterChange = useCallback((status: string) => {
		setFilters(prev => ({ ...prev, status }))
		setPagination(prev => ({ ...prev, page: 1 }))
	}, [])

	const handlePageChange = useCallback(
		(event: React.ChangeEvent<unknown>, page: number) => {
			setPagination(prev => ({ ...prev, page }))
		},
		[]
	)

	// Дебаунс для поиска
	useEffect(() => {
		const timer = setTimeout(
			() => {
				loadUsers()
			},
			filters.search ? 500 : 0
		) // Задержка только для поиска

		return () => clearTimeout(timer)
	}, [loadUsers, filters.search])

	// Обновление пользователей
	const refreshUsers = useCallback(() => {
		loadUsers()
	}, [loadUsers])

	return {
		users,
		loading,
		error,
		pagination,
		filters,
		handleSearchChange,
		handleRoleFilterChange,
		handleStatusFilterChange,
		handlePageChange,
		refreshUsers,
	}
}
