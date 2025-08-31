import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SubmissionFilters } from '../../../../services/submissionService'
import submissionService from '../../../../services/submissionService'
import api from '../../../../services/api'
import { useAuth } from '../../../../contexts/auth'
import { MySubmissionsState, BitrixStage, User } from '../types'
import {
	DEFAULT_ROWS_PER_PAGE,
	DEFAULT_STATUS_LABELS,
	DEFAULT_STATUS_FILTER,
} from '../constants'

export const useMySubmissions = () => {
	const navigate = useNavigate()
	const { user } = useAuth()

	const [state, setState] = useState<MySubmissionsState>({
		submissions: [],
		loading: true,
		error: null,
		page: 0,
		rowsPerPage: DEFAULT_ROWS_PER_PAGE,
		total: 0,
		filters: {
			status: DEFAULT_STATUS_FILTER, // По умолчанию показываем только новые заявки
		},
	})

	const [bitrixStages, setBitrixStages] = useState<BitrixStage[]>([])
	const [users, setUsers] = useState<User[]>([])
	const [statusLabels, setStatusLabels] = useState(DEFAULT_STATUS_LABELS)

	// Проверяем, является ли пользователь администратором
	const isAdmin = user?.role === 'admin'

	// Загрузка статусов из Битрикс24
	const loadBitrixStages = async () => {
		try {
			const response = await submissionService.getBitrixDealStages('1')

			if (response.success && response.data && response.data.length > 0) {
				setBitrixStages(response.data)
			}
		} catch (err: any) {
			console.error('Ошибка загрузки статусов из Битрикс24:', err)
		}
	}

	// Загрузка пользователей для фильтра (только для админов)
	const loadUsers = async () => {
		if (!isAdmin) return

		try {
			const response = await api.get('/api/users')
			if (response.data.success) {
				setUsers(response.data.data)
			}
		} catch (err: any) {
			console.error('Ошибка загрузки пользователей:', err)
		}
	}

	// Загрузка заявок
	const loadSubmissions = async () => {
		try {
			setState(prev => ({ ...prev, loading: true }))

			const response = isAdmin
				? await submissionService.getSubmissions({
						...state.filters,
						page: state.page + 1,
						limit: state.rowsPerPage,
				  })
				: await submissionService.getMySubmissions({
						...state.filters,
						page: state.page + 1,
						limit: state.rowsPerPage,
				  })

			// Безопасная обработка ответа с проверкой на существование структуры
			const submissions = response?.data || []
			const pagination = response?.pagination || { total: 0 }
			
			setState(prev => ({
				...prev,
				submissions,
				total: pagination.total || 0,
				loading: false,
				error: null,
			}))
		} catch (err: any) {
			setState(prev => ({
				...prev,
				error: err.message || 'Ошибка загрузки заявок',
				loading: false,
			}))
		}
	}

	// Обработчики событий
	const handleEditSubmission = async (submission: any) => {
		try {
			console.log(
			'[CLIENT EDIT DEBUG] Начало редактирования заявки:',
				submission.id
			)

			// Получаем заявку с актуальными данными из Битрикс24
			console.log(
			'[CLIENT EDIT DEBUG] Запрос актуальных данных из Битрикс24...'
			)
			const response = await submissionService.getSubmissionForEdit(
				submission.id
			)

			console.log(
			'[CLIENT EDIT DEBUG] response.data.preloadedOptions:',
				response.data.preloadedOptions
			)

			if (response.success) {
				console.log(
				'[CLIENT EDIT DEBUG] Обновленные formData:',
					response.data.formData
				)
				console.log(
				'[CLIENT EDIT DEBUG] Предзагруженные опции:',
					response.data.preloadedOptions
				)

				// Сохраняем актуальные данные для редактирования
				const editData = {
					submissionId: response.data.id,
					formId: response.data.formId,
					formData: response.data.formData,
					preloadedOptions: response.data.preloadedOptions || {},
				}

				localStorage.setItem('editSubmissionData', JSON.stringify(editData))

				navigate(`/?edit=${submission.id}`)
			} else {
				// Если не удалось получить актуальные данные, используем локальные
				console.warn(
					'[CLIENT EDIT DEBUG] Не удалось получить актуальные данные из Битрикс24, используем локальные данные'
				)
				localStorage.setItem(
					'editSubmissionData',
					JSON.stringify({
						submissionId: submission.id,
						formId: submission.formId._id,
						formData: submission.formData,
					})
				)

				navigate(`/?edit=${submission.id}`)
			}
		} catch (error: any) {
			console.error(
				'[CLIENT EDIT DEBUG] Ошибка получения данных для редактирования:',
				error
			)

			// В случае ошибки используем локальные данные
			console.warn(
			'[CLIENT EDIT DEBUG] Используем локальные данные из-за ошибки'
			)
			localStorage.setItem(
				'editSubmissionData',
				JSON.stringify({
					submissionId: submission.id,
					formId: submission.formId._id,
					formData: submission.formData,
				})
			)

			navigate(`/?edit=${submission.id}`)
		}
	}

	const handleCopySubmission = async (submission: any) => {
		try {
			console.log(
				'[CLIENT COPY] Начало копирования заявки:',
				submission.id
			)

			// Получаем данные заявки для копирования (теперь с preloadedOptions)
			const response = await submissionService.copySubmission(submission.id)

			console.log(
				'[CLIENT COPY] response.data.preloadedOptions:',
				response.data.preloadedOptions
			)

			if (response.success) {
				console.log(
					'[CLIENT COPY] Предзагруженные опции:',
					response.data.preloadedOptions
				)

				// Сохраняем данные точно как для редактирования, но без submissionId
				const copyData = {
					// НЕ передаем submissionId - это новая заявка
					formId: response.data.formId,
					formData: response.data.formData,
					preloadedOptions: response.data.preloadedOptions || {},
					isCopy: true,
					originalTitle: response.data.originalTitle,
					originalSubmissionNumber: response.data.originalSubmissionNumber,
				}

				sessionStorage.setItem('copyFormData', JSON.stringify(copyData))

				navigate(`/?copy=${submission.id}`)
			} else {
				console.warn('[CLIENT COPY] Не удалось получить данные для копирования')
				setState(prev => ({
					...prev,
					error: 'Не удалось получить данные для копирования',
				}))
			}
		} catch (err: any) {
			console.error('[CLIENT COPY] Ошибка копирования:', err)
			setState(prev => ({
				...prev,
				error: err.message || 'Ошибка копирования заявки',
			}))
		}
	}

	const handleStatusChange = async (
		submissionId: string,
		newStatus: string,
		comment?: string
	) => {
		try {
			await submissionService.updateStatus(
				submissionId,
				newStatus,
				comment || ''
			)
			loadSubmissions()
		} catch (err: any) {
			setState(prev => ({
				...prev,
				error: err.message || 'Ошибка изменения статуса',
			}))
		}
	}

	const handleCancelSubmission = async (
		submission: any,
		comment?: string
	) => {
		try {
			console.log('[CLIENT CANCEL] Начало отмены заявки:', submission.id)
			
			// Подтверждение отмены
			const confirmCancel = window.confirm(
				`Вы действительно хотите отменить заявку ${submission.submissionNumber || submission.id}?`
			)
			
			if (!confirmCancel) {
				return
			}

			// Запрос комментария для причины отмены
			let cancelComment = comment
			if (!cancelComment) {
				cancelComment = window.prompt(
					'Укажите причину отмены заявки (необязательно):'
				) || undefined
			}

			const response = await submissionService.cancelSubmission(
				submission.id,
				cancelComment
			)

			if (response.success) {
				console.log('[CLIENT CANCEL] Заявка успешно отменена:', response.data)
				// Перезагружаем список заявок
				loadSubmissions()
			} else {
				setState(prev => ({
					...prev,
					error: 'Не удалось отменить заявку',
				}))
			}
		} catch (err: any) {
			console.error('[CLIENT CANCEL] Ошибка отмены заявки:', err)
			setState(prev => ({
				...prev,
				error: err.message || 'Ошибка отмены заявки',
			}))
		}
	}

	const handleFilterChange = (newFilters: Partial<SubmissionFilters>) => {
		setState(prev => ({
			...prev,
			filters: { ...prev.filters, ...newFilters },
			page: 0,
		}))
	}

	const handlePageChange = (event: unknown, newPage: number) => {
		setState(prev => ({ ...prev, page: newPage }))
	}

	const handleRowsPerPageChange = (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		setState(prev => ({
			...prev,
			rowsPerPage: parseInt(event.target.value, 10),
			page: 0,
		}))
	}

	const resetFilters = () => {
		setState(prev => ({
			...prev,
			filters: {
				status: DEFAULT_STATUS_FILTER, // Возвращаем к дефолтному фильтру "Новые"
			},
			page: 0,
		}))
	}

	// Эффекты
	useEffect(() => {
		loadBitrixStages()
		loadUsers()
	}, [isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		loadSubmissions()
	}, [state.page, state.rowsPerPage, state.filters, isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

	return {
		// Состояние
		...state,
		bitrixStages,
		users,
		statusLabels,
		isAdmin,

		// Методы
		loadSubmissions,
		handleEditSubmission,
		handleCopySubmission,
		handleCancelSubmission,
		handleStatusChange,
		handleFilterChange,
		handlePageChange,
		handleRowsPerPageChange,
		resetFilters,
	}
}
