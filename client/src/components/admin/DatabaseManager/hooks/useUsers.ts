import { useState, useEffect, useCallback } from 'react'
import { UserService } from '../../../../services/userService'

interface User {
	_id: string
	firstName: string
	lastName?: string
	email: string
	role: 'admin' | 'user'
	bitrix_id?: string
}

interface UseUsersReturn {
	data: User[] | null
	isLoading: boolean
	error: string | null
	updateUser: (id: string, updates: Partial<User>) => Promise<void>
	reloadData: () => Promise<void>
}

export const useUsers = (): UseUsersReturn => {
	const [data, setData] = useState<User[] | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const loadData = useCallback(async () => {
		try {
			setIsLoading(true)
			setError(null)
			const users = await UserService.getAllUsers()

			// Сортируем по имени для удобства просмотра
			const sortedUsers = users.sort((a: User, b: User) =>
				a.firstName.localeCompare(b.firstName)
			)

			setData(sortedUsers)
		} catch (err: any) {
			console.error('Ошибка загрузки пользователей:', err)
			setError(err.message || 'Неизвестная ошибка')
		} finally {
			setIsLoading(false)
		}
	}, [])

	const updateUser = useCallback(
		async (id: string, updates: Partial<User>) => {
			try {
				console.log('🔄 Обновление пользователя:', { id, updates })

				// Оптимистичное обновление
				setData(prev => {
					if (!prev) return prev
					return prev.map(user =>
						user._id === id ? { ...user, ...updates } : user
					)
				})

				// Отправляем обновление на сервер
				await UserService.updateUser(id, updates)
				console.log('✅ Пользователь успешно обновлен')
			} catch (err: any) {
				console.error('❌ Ошибка обновления пользователя:', err)

				// Откатываем изменения при ошибке
				await loadData()
				throw err
			}
		},
		[loadData]
	)

	const reloadData = useCallback(async () => {
		await loadData()
	}, [loadData])

	useEffect(() => {
		loadData()
	}, [loadData])

	return {
		data,
		isLoading,
		error,
		updateUser,
		reloadData,
	}
}
