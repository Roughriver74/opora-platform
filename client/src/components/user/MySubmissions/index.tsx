import React, { useState, useEffect, useCallback } from 'react'
import {
	Box,
	Paper,
	Typography,
	TablePagination,
	Chip,
	IconButton,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Card,
	CardContent,
	Stack,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	TextField,
	Tooltip,
	useTheme,
	useMediaQuery,
	Collapse,
	Pagination,
	ButtonGroup,
	Container,
	CircularProgress,
} from '@mui/material'
import {
	Assignment as AssignmentIcon,
	Schedule as ScheduleIcon,
	Edit as EditIcon,
	CheckCircle as CheckCircleIcon,
	Error as ErrorIcon,
	Pending as PendingIcon,
	Search as SearchIcon,
	FilterList as FilterIcon,
	ExpandMore as ExpandMoreIcon,
	ExpandLess as ExpandLessIcon,
	Visibility as VisibilityIcon,
	Business as BusinessIcon,
	Description as DescriptionIcon,
	FileCopy as FileCopyIcon,
	Sort as SortIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import SubmissionService from '../../../services/submissionService'
import { settingsService } from '../../../services/settingsService'
import {
	Submission,
	SubmissionHistory,
	SubmissionFilters,
	BitrixStage,
} from '../../../services/submissionService'
import { useAuth } from '../../../contexts/auth'
import { useNotificationHelpers } from '../../../contexts/notification'
import api from '../../../services/api'
import elasticsearchService from '../../../services/elasticsearchService'
import {
	DEFAULT_STATUS_FILTER,
	SORT_OPTIONS,
	DEFAULT_SORT_BY,
	DEFAULT_SORT_ORDER,
} from './constants'

// Конфигурация полей материалов с приоритетом отображения
// Загружается из API через настройки формы. Дефолтный конфиг пустой.
const MATERIAL_FIELDS_CONFIG: Record<string, {
	priority: number
	label: string
	fields: string[]
	volumeFields: string[]
}> = {}

// Тип для конфигурации материалов
type MaterialConfig = typeof MATERIAL_FIELDS_CONFIG

// Получить все ID полей материалов для загрузки названий
const getAllMaterialFieldIds = (config: MaterialConfig): string[] => {
	const allFields: string[] = []
	Object.values(config).forEach(materialConfig => {
		allFields.push(...materialConfig.fields)
	})
	return allFields
}

// Константы перенесены в отдельный файл

const MySubmissions = () => {
	const navigate = useNavigate()
	const { user } = useAuth()
	const { showError, showSuccess } = useNotificationHelpers()
	const theme = useTheme()
	const isMobile = useMediaQuery(theme.breakpoints.down('md'))

	// Состояния
	const [submissions, setSubmissions] = useState<Submission[]>([])
	const [loading, setLoading] = useState(true)
	const [selectedSubmission, setSelectedSubmission] =
		useState<Submission | null>(null)
	const [, setSubmissionHistory] = useState<SubmissionHistory[]>([])
	const [detailsOpen, setDetailsOpen] = useState(false)
	const [formFields, setFormFields] = useState<any[]>([])
	const [bitrixStages, setBitrixStages] = useState<BitrixStage[]>([])
	const [filters, setFilters] = useState<SubmissionFilters>({
		status: DEFAULT_STATUS_FILTER,
		sortBy: DEFAULT_SORT_BY,
		sortOrder: DEFAULT_SORT_ORDER,
	})
	const [page, setPage] = useState(0)
	const [rowsPerPage, setRowsPerPage] = useState(12)
	const [total, setTotal] = useState(0)
	const [users, setUsers] = useState<any[]>([])
	const [submissionFormFields, setSubmissionFormFields] = useState<
		Record<string, Record<string, any>>
	>({})

	// Кэш названий компаний и продуктов
	const [companyNames, setCompanyNames] = useState<Record<string, string>>({})
	const [productNames, setProductNames] = useState<Record<string, string>>({})

	// Настройки системы
	const [settings, setSettings] = useState({
		enableCopying: true,
		allowUserStatusChange: true,
		allowUserEdit: true,
		copyButtonText: 'Копировать заявку',
	})

	// Конфигурация полей материалов (загружается из настроек или используется дефолтная)
	const [materialFieldsConfig, setMaterialFieldsConfig] = useState(MATERIAL_FIELDS_CONFIG)

	// Конфигурация специальных полей (clientField, shipmentDateField и др.) - загружается из настроек
	const [specialFieldsConfig, setSpecialFieldsConfig] = useState<{
		clientField?: string
		shipmentDateField?: string
		abnTimeField?: string
	}>({})
	const [filtersExpanded, setFiltersExpanded] = useState(false)
	const [searchValue, setSearchValue] = useState('')
	const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(
		null
	)

	// Проверяем, является ли пользователь администратором
	const isAdmin = user?.role === 'admin'

	// Применение фильтров
	const handleFilterChange = useCallback(
		(newFilters: Partial<SubmissionFilters>) => {
			setFilters(prevFilters => ({ ...prevFilters, ...newFilters }))
			setPage(0)
		},
		[]
	)

	// Обработчик изменения сортировки
	const handleSortChange = useCallback(
		(sortBy: 'shipmentDate' | 'createdAt') => {
			setFilters(prev => ({
				...prev,
				sortBy,
				// При смене поля сортировки устанавливаем логичный порядок:
				// - для даты отгрузки: ASC (ближайшие сверху)
				// - для даты создания: DESC (новые сверху)
				sortOrder: sortBy === 'shipmentDate' ? 'asc' : 'desc',
			}))
			setPage(0)
		},
		[]
	)

	// Обработчик изменения поиска с debounce
	const handleSearchChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const value = e.target.value
			setSearchValue(value)

			// Очищаем предыдущий timeout
			if (searchTimeout) {
				clearTimeout(searchTimeout)
			}

			// Устанавливаем новый timeout
			const timeout = setTimeout(() => {
				// При поиске сбрасываем фильтр по статусу, чтобы искать по всем заявкам
				const newFilters: Partial<SubmissionFilters> = { search: value }
				if (value.trim()) {
					// Если есть поисковый запрос, сбрасываем статус
					newFilters.status = undefined
				} else {
					// Если поиск пустой, возвращаем дефолтный фильтр
					newFilters.status = DEFAULT_STATUS_FILTER
				}
				handleFilterChange(newFilters)
			}, 500)

			setSearchTimeout(timeout)
		},
		[searchTimeout, handleFilterChange]
	)

	// Загрузка настроек системы
	const loadSettings = async () => {
		try {
			const [
				enableCopying,
				allowUserStatusChange,
				allowUserEdit,
				copyButtonText,
				materialConfig,
				specialFields,
			] = await Promise.all([
				settingsService.getSettingValue('submissions.enable_copying', true),
				settingsService.getSettingValue(
					'submissions.allow_user_status_change',
					true
				),
				settingsService.getSettingValue('submissions.allow_user_edit', true),
				settingsService.getSettingValue(
					'submissions.copy_button_text',
					'Копировать заявку'
				),
				settingsService.getSettingValue(
					'submissions.material_fields_config',
					MATERIAL_FIELDS_CONFIG
				),
				settingsService.getSettingValue(
					'submissions.special_fields_config',
					{}
				),
			])

			setSettings({
				enableCopying,
				allowUserStatusChange,
				allowUserEdit,
				copyButtonText,
			})

			// Обновляем конфигурацию материалов если получена из настроек
			if (materialConfig && typeof materialConfig === 'object') {
				setMaterialFieldsConfig(materialConfig)
			}

			// Обновляем конфигурацию специальных полей
			if (specialFields && typeof specialFields === 'object') {
				setSpecialFieldsConfig(specialFields)
			}
		} catch (error) {
			console.error('Ошибка загрузки настроек:', error)
			// Используем значения по умолчанию при ошибке
		}
	}

	// Загрузка статусов из Битрикс24
	const loadBitrixStages = async () => {
		try {
			const response = await SubmissionService.getBitrixDealStages('1') // Используем категорию 1

			if (response.success && response.data && response.data.length > 0) {
				setBitrixStages(response.data)
			} else {
				console.warn('Нет данных о статусах или некорректный ответ')
			}
		} catch (err: any) {
			console.error('Ошибка загрузки статусов из Битрикс24:', err)
			console.error('Детали ошибки:', err.response?.data)
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

	// Загрузка данных полей формы для заявки (зарезервировано для будущего использования)
	// const loadSubmissionFormFields = async (submissionId: string) => {
	// 	try {
	// 		const response = await SubmissionService.getSubmissionFormFields(
	// 			submissionId
	// 		)
	// 		if (response.success && response.data.formFields) {
	// 			setSubmissionFormFields(prev => ({
	// 				...prev,
	// 				[submissionId]: response.data.formFields || {},
	// 			}))
	// 		}
	// 	} catch (error) {
	// 		console.error('Ошибка загрузки данных полей формы:', error)
	// 	}
	// }

	// Загрузка названий компаний и продуктов для всех заявок
	const loadNamesForSubmissions = async (submissions: Submission[]) => {
		try {
			console.log(
				'[MySubmissions] Начинаем загрузку названий для заявок:',
				submissions.length
			)
			// Собираем все уникальные ID компаний и продуктов
			const companyIds = new Set<string>()
			const productIds = new Set<string>()

			// Загружаем данные полей формы для каждой заявки если их еще нет
			const formFieldsPromises = submissions.map(async submission => {
				if (!submissionFormFields[submission.id]) {
					try {
						const response = await SubmissionService.getSubmissionFormFields(
							submission.id
						)
						if (response.success && response.data.formFields) {
							setSubmissionFormFields(prev => ({
								...prev,
								[submission.id]: response.data.formFields || {},
							}))
							return response.data.formFields || {}
						}
					} catch (error) {
						console.error(
							`Ошибка загрузки полей формы для заявки ${submission.id}:`,
							error
						)
					}
				}
				return submissionFormFields[submission.id] || {}
			})

			// Ждем загрузки всех полей формы
			const allFormFields = await Promise.all(formFieldsPromises)

			// Теперь собираем ID из загруженных данных
			const materialFieldIds = getAllMaterialFieldIds(materialFieldsConfig)

			const clientFieldId = specialFieldsConfig.clientField
			allFormFields.forEach(formFieldsData => {
				// Компания (динамическое поле из настроек)
				if (clientFieldId && formFieldsData[clientFieldId]) {
					const companyValue = formFieldsData[clientFieldId]
					if (typeof companyValue === 'object' && companyValue.ID) {
						companyIds.add(companyValue.ID.toString())
					} else if (typeof companyValue === 'string' && companyValue.trim()) {
						companyIds.add(companyValue.trim())
					}
				}

				// Собираем ID всех материалов
				materialFieldIds.forEach(fieldId => {
					const fieldValue = formFieldsData[fieldId]
					if (fieldValue) {
						if (typeof fieldValue === 'object' && fieldValue.ID) {
							productIds.add(fieldValue.ID.toString())
						} else if (typeof fieldValue === 'string' && fieldValue.trim()) {
							productIds.add(fieldValue.trim())
						}
					}
				})
			})

			// Загружаем названия параллельно
			const [companyNamesResult, productNamesResult] = await Promise.all([
				companyIds.size > 0
					? elasticsearchService.getCompanyNamesByIds(Array.from(companyIds))
					: Promise.resolve({}),
				productIds.size > 0
					? elasticsearchService.getProductNamesByIds(Array.from(productIds))
					: Promise.resolve({}),
			])

			// Обновляем состояния
			setCompanyNames(prev => ({ ...prev, ...companyNamesResult }))
			setProductNames(prev => ({ ...prev, ...productNamesResult }))
		} catch (error) {
			console.error('Ошибка загрузки названий:', error)
		}
	}

	// Загрузка заявок
	const loadSubmissions = async () => {
		try {
			setLoading(true)
			let response

			if (isAdmin) {
				// Администратор видит все заявки
				response = await SubmissionService.getSubmissions({
					...filters,
					page: page + 1,
					limit: rowsPerPage,
				})
			} else {
				// Обычный пользователь видит только свои заявки
				response = await SubmissionService.getMySubmissions({
					...filters,
					page: page + 1,
					limit: rowsPerPage,
				})
			}

			setSubmissions(response.data)
			setTotal(response.total || response.pagination?.total || 0)

			// Загружаем названия компаний и продуктов (включая загрузку полей формы)
			loadNamesForSubmissions(response.data)
		} catch (err: any) {
			showError(err.message || 'Ошибка загрузки заявок')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		loadSettings()
		loadBitrixStages()
		loadUsers()
		loadSubmissions()
	}, [page, rowsPerPage, filters, isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

	// Cleanup timeout при размонтировании
	useEffect(() => {
		return () => {
			if (searchTimeout) {
				clearTimeout(searchTimeout)
			}
		}
	}, [searchTimeout])

	// Функция для редактирования заявки - НОВАЯ ЛОГИКА
	const handleEditSubmission = async (submission: Submission) => {
		try {
			console.log(
				'[CLIENT EDIT DEBUG] Начало редактирования заявки:',
				submission.id
			)

			// Получаем заявку с актуальными данными из Битрикс24
			console.log(
				'[CLIENT EDIT DEBUG] Запрос актуальных данных из Битрикс24...'
			)
			const response = await SubmissionService.getSubmissionForEdit(
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
					formId:
						response.data.formId || submission.formId?.id || submission.formId,
					formData: response.data.formData,
					preloadedOptions: response.data.preloadedOptions || {},
				}

				localStorage.setItem('editSubmissionData', JSON.stringify(editData))

				navigate(`/?edit=${submission.id}`)
			} else {
				console.warn(
					'[CLIENT EDIT DEBUG] Не удалось получить актуальные данные'
				)
				// В случае ошибки используем локальные данные
				localStorage.setItem(
					'editSubmissionData',
					JSON.stringify({
						submissionId: submission.id,
						formId: submission.formId?.id || 'unknown',
						formData: {},
					})
				)
				navigate(`/?edit=${submission.id}`)
			}
		} catch (error: any) {
			console.error('[CLIENT EDIT DEBUG] Ошибка получения данных:', error)
			// В случае ошибки переходим к форме с пустыми данными
			localStorage.setItem(
				'editSubmissionData',
				JSON.stringify({
					submissionId: submission.id,
					formId: submission.formId?.id || 'unknown',
					formData: {},
				})
			)
			navigate(`/?edit=${submission.id}`)
		}
	}

	// Копирование заявки - точно как редактирование
	const handleCopySubmission = async (submission: Submission) => {
		try {
			// Получаем данные заявки для копирования (теперь с preloadedOptions)
			const response = await SubmissionService.copySubmission(submission.id)

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
				showError('Не удалось получить данные для копирования')
			}
		} catch (err: any) {
			console.error('[CLIENT COPY] Ошибка копирования:', err)
			showError(err.message || 'Ошибка копирования заявки')
		}
	}

	// Обновление статуса заявки
	const handleStatusChange = async (
		submissionId: string,
		newStatus: string
	) => {
		try {
			await SubmissionService.updateStatus(
				submissionId,
				newStatus,
				'' // Пустой комментарий
			)
			loadSubmissions() // Перезагружаем список

			// Если детали открыты, обновляем их тоже
			if (selectedSubmission && selectedSubmission.id === submissionId) {
				const response = await SubmissionService.getSubmissionById(submissionId)
				setSelectedSubmission(response.data.submission)
				setSubmissionHistory(response.data.history)
			}

			showSuccess('Статус заявки успешно изменен')
		} catch (err: any) {
			showError(err.message || 'Ошибка изменения статуса')
		}
	}

	// Получение названия поля по его имени
	// const getFieldLabel = (fieldName: string): string => {
	// 	const field = formFields.find(f => f.name === fieldName)
	// 	return field ? field.label : fieldName
	// }

	// Извлечение чистого статуса без префикса категории
	const getCleanStatus = (status: string): string => {
		if (status.includes(':')) {
			return status.split(':')[1]
		}
		return status
	}

	// Получение названия статуса из Битрикс24
	const getStatusName = (status: string): string => {
		const cleanStatus = getCleanStatus(status)
		const stage = bitrixStages.find(
			stage => stage.id === status || stage.id === cleanStatus
		)

		// Если статус найден в загруженных данных из Битрикса
		if (stage) {
			return stage.name
		}

		// Fallback для основных статусов, если данные из Битрикса не загрузились
		switch (status) {
			case 'C1:NEW':
				return 'Новая'
			case 'C1:UC_GJLIZP':
				return 'Отправлено'
			case 'C1:WON':
				return 'Отгружено'
			default:
				return status // Показываем код, если название не найдено
		}
	}

	const handleChangePage = (event: unknown, newPage: number) => {
		setPage(newPage)
	}

	const handleChangeRowsPerPage = (event: any) => {
		setRowsPerPage(parseInt(event.target.value, 10))
		setPage(0)
	}

	if (loading && submissions.length === 0) {
		return (
			<Box
				display='flex'
				justifyContent='center'
				alignItems='center'
				minHeight='400px'
			>
				<Typography>Загрузка ваших заявок...</Typography>
			</Box>
		)
	}

	// Отображение подробностей заявки
	const handleShowDetails = async (submission: Submission) => {
		try {
			const response = await SubmissionService.getSubmissionById(submission.id)
			setSelectedSubmission(response.data.submission)
			setSubmissionHistory(response.data.history)
			setFormFields(response.data.formFields || [])
			setDetailsOpen(true)
		} catch (err: any) {
			showError(err.message || 'Ошибка загрузки деталей заявки')
		}
	}

	// Получение значения поля заявки
	// Функция больше не нужна, так как formData убрано

	// Карточка заявки (для всех устройств)
	const SubmissionCard = ({ submission }: { submission: Submission }) => {
		// Проверяем, является ли статус "Отгружено" (C1:WON)
		const isShipped = submission.status === 'C1:WON'

		// Получаем данные полей формы для этой заявки
		const formFieldsData = submissionFormFields[submission.id] || {}

		// Функция для получения значения поля
		const getFieldValue = (fieldName: string): string => {
			const value = formFieldsData[fieldName]
			if (value === undefined || value === null || value === '') {
				return 'Не указано'
			}

			// Если это объект, пытаемся извлечь название
			if (typeof value === 'object') {
				return value.TITLE || value.NAME || value.label || JSON.stringify(value)
			}

			return String(value)
		}

		// Функция для получения названия компании по ID
		const getCompanyName = (fieldName: string): string => {
			const value = formFieldsData[fieldName]
			if (!value) return 'Не указано'

			let companyId: string
			if (typeof value === 'object' && value.ID) {
				companyId = value.ID.toString()
			} else if (typeof value === 'string' && value.trim()) {
				companyId = value.trim()
			} else {
				return 'Не указано'
			}

			// Возвращаем название из кэша или ID если название не найдено
			return companyNames[companyId] || companyId
		}

		// Функция для получения названия продукта по ID поля
		const getProductName = (fieldName: string): string => {
			const value = formFieldsData[fieldName]
			if (!value) return 'Не указано'

			let productId: string
			if (typeof value === 'object' && value.ID) {
				productId = value.ID.toString()
			} else if (typeof value === 'string' && value.trim()) {
				productId = value.trim()
			} else {
				return 'Не указано'
			}

			// Возвращаем название из кэша или ID если название не найдено
			return productNames[productId] || productId
		}

		// Функция для получения материала с учетом приоритета
		const getMaterialInfo = (): { name: string; type: string; volume: string | null } => {
			// Сортируем конфигурации по приоритету (используем materialFieldsConfig из настроек)
			const sortedConfigs = Object.entries(materialFieldsConfig)
				.sort(([, a], [, b]) => a.priority - b.priority)

			for (const [materialType, config] of sortedConfigs) {
				// Проверяем каждое поле материала
				for (const fieldId of config.fields) {
					const value = formFieldsData[fieldId]
					if (value) {
						let productId: string | null = null
						if (typeof value === 'object' && value.ID) {
							productId = value.ID.toString()
						} else if (typeof value === 'string' && value.trim()) {
							productId = value.trim()
						}

						if (productId) {
							// Находим объем для этого типа материала
							let volume: string | null = null
							for (const volumeFieldId of config.volumeFields) {
								const volumeValue = formFieldsData[volumeFieldId]
								if (volumeValue) {
									volume = typeof volumeValue === 'object'
										? volumeValue.toString()
										: String(volumeValue)
									break
								}
							}

							return {
								name: productNames[productId] || productId,
								type: materialType,
								volume,
							}
						}
					}
				}
			}

			return { name: 'Не указано', type: '', volume: null }
		}

		// Получаем информацию о материале для карточки
		const materialInfo = getMaterialInfo()

		return (
			<Card
				sx={{
					border: '1px solid',
					borderColor: 'divider',
					height: '100%',
					display: 'flex',
					flexDirection: 'column',
					'&:hover': {
						boxShadow: 3,
						borderColor: 'primary.main',
					},
					transition: 'all 0.2s ease-in-out',
				}}
			>
				<CardContent sx={{ pb: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
					{/* Заголовок карточки */}
					<Box
						sx={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'flex-start',
							mb: 1.5,
						}}
					>
						<Box sx={{ flex: 1, minWidth: 0, mr: 1 }}>
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
								<Typography
									variant='caption'
									component='span'
									sx={{ fontWeight: 'bold', color: 'primary.main' }}
								>
									#{submission.bitrixDealId || 'Н/Д'}
								</Typography>
								{submission.isPeriodSubmission && (
									<Tooltip title='Периодическая заявка'>
										<ScheduleIcon
											sx={{
												fontSize: 16,
												color: 'primary.main',
											}}
										/>
									</Tooltip>
								)}
							</Box>
							<Typography
								variant='subtitle2'
								component='div'
								sx={{
									fontWeight: 'bold',
									overflow: 'hidden',
									textOverflow: 'ellipsis',
									whiteSpace: 'nowrap',
								}}
								title={submission.title}
							>
								{submission.title || 'Без названия'}
							</Typography>
							<Typography variant='caption' color='text.secondary'>
								{submission.userEmail || 'Анонимная заявка'}
							</Typography>
						</Box>
						{/* Битрикс24 статус */}
						{submission.bitrixDealId ? (
							<Chip
								icon={
									submission.bitrixSyncStatus === 'synced' ? (
										<CheckCircleIcon />
									) : submission.bitrixSyncStatus === 'failed' ? (
										<ErrorIcon />
									) : (
										<PendingIcon />
									)
								}
								label={
									submission.bitrixSyncStatus === 'synced'
										? 'Синхр.'
										: submission.bitrixSyncStatus === 'failed'
										? 'Ошибка'
										: 'Ожидает'
								}
								color={
									submission.bitrixSyncStatus === 'synced'
										? 'success'
										: submission.bitrixSyncStatus === 'failed'
										? 'error'
										: 'warning'
								}
								size='small'
							/>
						) : (
							<Chip label='Не созд.' color='default' size='small' />
						)}
					</Box>

					{/* Детали заявки */}
					<Box sx={{ flex: 1 }}>
						{/* Компания */}
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
							<BusinessIcon fontSize='small' color='action' sx={{ flexShrink: 0 }} />
							<Typography
								variant='body2'
								sx={{
									fontWeight: 'medium',
									overflow: 'hidden',
									textOverflow: 'ellipsis',
									whiteSpace: 'nowrap',
								}}
								title={getCompanyName(specialFieldsConfig.clientField || '')}
							>
								{getCompanyName(specialFieldsConfig.clientField || '')}
							</Typography>
						</Box>

						{/* Материал с приоритетом */}
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
							<DescriptionIcon fontSize='small' color='action' sx={{ flexShrink: 0 }} />
							<Typography
								variant='body2'
								sx={{
									overflow: 'hidden',
									textOverflow: 'ellipsis',
									whiteSpace: 'nowrap',
								}}
								title={materialInfo.name}
							>
								{materialInfo.name}
							</Typography>
						</Box>

						{/* Объем и Дата отгрузки в одну строку */}
						<Box
							sx={{
								display: 'flex',
								gap: 2,
								flexWrap: 'wrap',
							}}
						>
							{/* Объем материала */}
							{materialInfo.volume && (
								<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
									<Typography variant='caption' color='text.secondary'>
										Объем:
									</Typography>
									<Typography variant='caption' sx={{ fontWeight: 'medium' }}>
										{materialInfo.volume} м³
									</Typography>
								</Box>
							)}

							{/* Дата и время отгрузки */}
							{specialFieldsConfig.shipmentDateField && formFieldsData[specialFieldsConfig.shipmentDateField] && (
								<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
									<ScheduleIcon sx={{ fontSize: 14, color: 'action.active' }} />
									<Typography variant='caption' sx={{ fontWeight: 'medium' }}>
										{format(
											new Date(getFieldValue(specialFieldsConfig.shipmentDateField || '')),
											'dd.MM.yy HH:mm',
											{ locale: ru }
										)}
									</Typography>
								</Box>
							)}
						</Box>
					</Box>

					{/* Действия */}
					<Box
						sx={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							mt: 'auto',
							pt: 1.5,
							borderTop: '1px solid',
							borderColor: 'divider',
						}}
					>
						{/* Статус */}
						<FormControl size='small' sx={{ minWidth: 100, maxWidth: 130 }}>
							<Select
								value={submission.status}
								onChange={(e: any) =>
									handleStatusChange(submission.id, e.target.value)
								}
								displayEmpty
								size='small'
								sx={{ fontSize: '0.75rem' }}
								renderValue={(value: any) => {
									const statusName = getStatusName(submission.status)
									return statusName || 'Не указан'
								}}
							>
								{bitrixStages.map(stage => (
									<MenuItem key={stage.id} value={stage.id}>
										{stage.name}
									</MenuItem>
								))}
							</Select>
						</FormControl>

						{/* Кнопки действий */}
						<ButtonGroup size='small' variant='outlined'>
							<Tooltip title='Подробнее'>
								<IconButton
									size='small'
									onClick={() => handleShowDetails(submission)}
									color='info'
								>
									<VisibilityIcon fontSize='small' />
								</IconButton>
							</Tooltip>
							{!isShipped && settings.allowUserEdit && (
								<Tooltip title='Редактировать'>
									<IconButton
										size='small'
										onClick={() => handleEditSubmission(submission)}
										color='primary'
									>
										<EditIcon fontSize='small' />
									</IconButton>
								</Tooltip>
							)}
							{settings.enableCopying && (
								<Tooltip title={settings.copyButtonText}>
									<IconButton
										size='small'
										onClick={() => handleCopySubmission(submission)}
										color='secondary'
									>
										<FileCopyIcon fontSize='small' />
									</IconButton>
								</Tooltip>
							)}
						</ButtonGroup>
					</Box>
				</CardContent>
			</Card>
		)
	}

	return (
		<Container
			maxWidth='lg'
			sx={{ mt: { xs: 2, sm: 4 }, px: { xs: 1, sm: 2 } }}
		>
			{/* Заголовок */}
			<Box
				sx={{
					display: 'flex',
					flexDirection: { xs: 'column', sm: 'row' },
					justifyContent: 'space-between',
					alignItems: { xs: 'flex-start', sm: 'center' },
					mb: 3,
					gap: { xs: 2, sm: 0 },
				}}
			>
				<Typography
					variant={isMobile ? 'h5' : 'h4'}
					component='h1'
					sx={{ fontWeight: 'bold', color: 'primary.main' }}
				>
					{isAdmin ? 'Все заявки' : 'Мои заявки'}
				</Typography>
				<Typography variant='body2' color='text.secondary'>
					Всего: {total} заявок
				</Typography>
			</Box>

			{/* Поиск - всегда активен */}
			<Paper sx={{ mb: 2, p: 2 }}>
				<TextField
					fullWidth
					size='small'
					placeholder='Поиск по номеру заявки, названию или содержимому...'
					value={searchValue}
					onChange={handleSearchChange}
					InputProps={{
						startAdornment: (
							<SearchIcon sx={{ mr: 1, color: 'action.active' }} />
						),
					}}
				/>
			</Paper>

			{/* Дополнительные фильтры */}
			<Paper sx={{ mb: 3, overflow: 'hidden' }}>
				<Box
					sx={{
						p: 2,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						bgcolor: 'grey.50',
					}}
				>
					<Typography
						variant='subtitle1'
						sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
					>
						<FilterIcon />
						Дополнительные фильтры
					</Typography>
					<IconButton
						onClick={() => setFiltersExpanded(!filtersExpanded)}
						size='small'
					>
						{filtersExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
					</IconButton>
				</Box>

				<Collapse in={filtersExpanded}>
					<Box sx={{ p: 2, pt: 0 }}>
						<Stack
							direction={{ xs: 'column', sm: 'row' }}
							spacing={2}
							alignItems='center'
							flexWrap='wrap'
						>
							{isAdmin && (
								<FormControl
									size='small'
									sx={{ minWidth: { xs: '100%', sm: '150px' } }}
								>
									<InputLabel>Клиент</InputLabel>
									<Select
										value={filters.userId || ''}
										label='Клиент'
										onChange={(e: any) =>
											handleFilterChange({ userId: e.target.value })
										}
									>
										<MenuItem value=''>Все клиенты</MenuItem>
										{users.map(user => (
											<MenuItem key={user.id} value={user.id}>
												{user.firstName && user.lastName
													? `${user.firstName} ${user.lastName}`
													: user.name}
											</MenuItem>
										))}
									</Select>
								</FormControl>
							)}

							<FormControl
								size='small'
								sx={{ minWidth: { xs: '100%', sm: '150px' } }}
							>
								<InputLabel>Статус</InputLabel>
								<Select
									value={filters.status || ''}
									label='Статус'
									onChange={(e: any) =>
										handleFilterChange({ status: e.target.value })
									}
								>
									<MenuItem value=''>Все статусы</MenuItem>
									{bitrixStages.map(stage => (
										<MenuItem key={stage.id} value={stage.id}>
											{stage.name}
										</MenuItem>
									))}
								</Select>
							</FormControl>

							{/* Сортировка */}
							<FormControl
								size='small'
								sx={{ minWidth: { xs: '100%', sm: '180px' } }}
							>
								<InputLabel>
									<Box
										sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
									>
										<SortIcon sx={{ fontSize: 16 }} />
										Сортировка
									</Box>
								</InputLabel>
								<Select
									value={filters.sortBy || DEFAULT_SORT_BY}
									label='Сортировка'
									onChange={(e: any) => handleSortChange(e.target.value)}
								>
									{SORT_OPTIONS.map(option => (
										<MenuItem key={option.value} value={option.value}>
											{option.label}
										</MenuItem>
									))}
								</Select>
							</FormControl>

							<Button
								variant='outlined'
								onClick={() => {
									setFilters({
										status: DEFAULT_STATUS_FILTER,
										sortBy: DEFAULT_SORT_BY,
										sortOrder: DEFAULT_SORT_ORDER,
									})
									setSearchValue('')
									setPage(0)
								}}
								sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
							>
								Сбросить фильтры
							</Button>
						</Stack>
					</Box>
				</Collapse>
			</Paper>

			{/* Основное содержимое */}
			{loading ? (
				<Box
					sx={{
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						minHeight: '200px',
						flexDirection: 'column',
						gap: 2,
					}}
				>
					<CircularProgress size={isMobile ? 40 : 60} />
					<Typography variant='body2' color='text.secondary'>
						Загрузка заявок...
					</Typography>
				</Box>
			) : submissions.length === 0 ? (
				<Paper sx={{ p: 4, textAlign: 'center' }}>
					<AssignmentIcon
						sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }}
					/>
					<Typography variant='h6' color='text.secondary' gutterBottom>
						У вас пока нет заявок
					</Typography>
					<Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
						Заполните форму заказа, чтобы создать первую заявку
					</Typography>
					<Button variant='contained' onClick={() => navigate('/')}>
						Создать заявку
					</Button>
				</Paper>
			) : (
				<>
					{/* Отображение заявок - карточки для всех устройств */}
					<Box
						sx={{
							display: 'grid',
							gridTemplateColumns: {
								xs: '1fr',
								md: 'repeat(2, 1fr)',
								lg: 'repeat(3, 1fr)',
							},
							gap: 2,
						}}
					>
						{submissions.map(submission => (
							<SubmissionCard key={submission.id} submission={submission} />
						))}
					</Box>

					{/* Пагинация */}
					<Box
						sx={{
							display: 'flex',
							justifyContent: 'center',
							mt: 3,
							flexDirection: { xs: 'column', sm: 'row' },
							alignItems: 'center',
							gap: 2,
						}}
					>
						{isMobile ? (
							<Pagination
								count={Math.ceil(total / rowsPerPage)}
								page={page + 1}
								onChange={(_: any, newPage: number) => setPage(newPage - 1)}
								color='primary'
								size='small'
								showFirstButton
								showLastButton
							/>
						) : (
							<TablePagination
								rowsPerPageOptions={[6, 12, 24]}
								component='div'
								count={total}
								rowsPerPage={rowsPerPage}
								page={page}
								onPageChange={handleChangePage}
								onRowsPerPageChange={handleChangeRowsPerPage}
								labelRowsPerPage='На странице:'
								labelDisplayedRows={({
									from,
									to,
									count,
								}: {
									from: number
									to: number
									count: number
								}) => `${from}-${to} из ${count}`}
							/>
						)}
					</Box>
				</>
			)}

			{/* Диалог деталей заявки */}
			<Dialog
				open={detailsOpen}
				onClose={() => setDetailsOpen(false)}
				maxWidth='md'
				fullWidth
				fullScreen={isMobile}
			>
				<DialogTitle
					sx={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
					}}
				>
					<Typography variant='h6'>
						Заявка № {selectedSubmission?.submissionNumber}
					</Typography>
					{isMobile && (
						<IconButton onClick={() => setDetailsOpen(false)}>
							<ExpandLessIcon />
						</IconButton>
					)}
				</DialogTitle>
				<DialogContent sx={{ p: { xs: 1, sm: 3 } }}>
					{selectedSubmission && (
						<Stack spacing={3}>
							{/* Основная информация */}
							<Card>
								<CardContent>
									<Typography variant='h6' gutterBottom>
										Информация о заявке
									</Typography>
									<Stack spacing={2}>
										<Box>
											<Typography
												variant='body2'
												color='text.secondary'
												component='span'
												sx={{ mb: 1, display: 'block' }}
											>
												<Typography component='strong'>Статус:</Typography>
											</Typography>
											<FormControl size='small' sx={{ minWidth: 200 }}>
												<Select
													value={getCleanStatus(selectedSubmission.status)}
													onChange={(e: any) =>
														handleStatusChange(
															selectedSubmission.id,
															e.target.value
														)
													}
													displayEmpty
													renderValue={(value: any) => {
														const statusName = getStatusName(
															selectedSubmission.status
														)
														return statusName || 'Не указан'
													}}
												>
													{bitrixStages.map(stage => (
														<MenuItem key={stage.id} value={stage.id}>
															{stage.name}
														</MenuItem>
													))}
												</Select>
											</FormControl>
										</Box>
										<Box>
											<Typography variant='body2' color='text.secondary'>
												<Typography component='strong'>Создано:</Typography>{' '}
												{format(
													new Date(selectedSubmission.createdAt),
													'dd.MM.yyyy HH:mm',
													{ locale: ru }
												)}
											</Typography>
										</Box>
									</Stack>
								</CardContent>
							</Card>

							{/* Заполненные поля формы */}
							{selectedSubmission.formData &&
								Object.keys(selectedSubmission.formData).length > 0 && (
									<Card sx={{ backgroundColor: '#f8f9fa' }}>
										<CardContent>
											<Typography variant='h6' gutterBottom color='primary'>
												Данные заявки
											</Typography>
											<Box
												sx={{
													mt: 2,
													maxHeight: '400px',
													overflowY: 'auto',
													'&::-webkit-scrollbar': {
														width: '8px',
													},
													'&::-webkit-scrollbar-track': {
														backgroundColor: 'rgba(0,0,0,0.05)',
														borderRadius: '4px',
													},
													'&::-webkit-scrollbar-thumb': {
														backgroundColor: 'rgba(0,0,0,0.2)',
														borderRadius: '4px',
														'&:hover': {
															backgroundColor: 'rgba(0,0,0,0.3)',
														},
													},
												}}
											>
												{(() => {
													// Собираем все заполненные поля без группировки по секциям
													const filledFields: any[] = []

													// Сортируем поля по порядку из формы
													const sortedFields = [...formFields].sort((a, b) => {
														return (a.order || 0) - (b.order || 0)
													})

													sortedFields.forEach((field: any) => {
														// Пропускаем заголовки секций
														if (field.type === 'header') {
															return
														}

														// Проверяем, есть ли значение для этого поля
														const value =
															selectedSubmission.formData?.[field.name]
														if (
															value !== undefined &&
															value !== null &&
															value !== '' &&
															!(Array.isArray(value) && value.length === 0)
														) {
															// Форматируем значение в зависимости от типа поля
															let displayValue = value
															if (field.type === 'checkbox') {
																displayValue = value ? '✓ Да' : '✗ Нет'
															} else if (field.type === 'date') {
																try {
																	displayValue = format(
																		new Date(value),
																		'dd.MM.yyyy',
																		{ locale: ru }
																	)
																} catch {
																	displayValue = value
																}
															} else if (
																field.type === 'select' ||
																field.type === 'radio'
															) {
																// Для select и radio полей ищем соответствующий label в опциях
																if (
																	field.options &&
																	Array.isArray(field.options)
																) {
																	const option = field.options.find(
																		(opt: any) => opt.value === value
																	)
																	displayValue = option ? option.label : value
																} else {
																	displayValue = value
																}
															} else if (field.type === 'autocomplete') {
																// Для autocomplete полей может быть сохранен ID, но нужно показать название
																// Сервер может вернуть обогащенные данные с label
																if (
																	typeof value === 'object' &&
																	value !== null
																) {
																	if (value.label) {
																		displayValue = value.label
																	} else if (value.TITLE) {
																		displayValue = value.TITLE
																	} else if (value.NAME) {
																		displayValue = value.NAME
																	} else {
																		displayValue = JSON.stringify(value)
																	}
																} else {
																	// Если это просто ID, попробуем найти в опциях
																	if (
																		field.options &&
																		Array.isArray(field.options)
																	) {
																		const option = field.options.find(
																			(opt: any) => opt.value === value
																		)
																		displayValue = option ? option.label : value
																	} else {
																		displayValue = value
																	}
																}
															} else if (Array.isArray(value)) {
																displayValue = value.join(', ')
															} else if (
																typeof value === 'object' &&
																value !== null
															) {
																if (value.label) {
																	displayValue = value.label
																} else if (value.TITLE) {
																	displayValue = value.TITLE
																} else if (value.NAME) {
																	displayValue = value.NAME
																} else {
																	displayValue = JSON.stringify(value)
																}
															}

															filledFields.push({
																label: field.label || field.name,
																value: displayValue,
																type: field.type,
															})
														}
													})

													if (filledFields.length === 0) {
														return (
															<Typography
																variant='body2'
																color='text.secondary'
																sx={{ fontStyle: 'italic' }}
															>
																Нет заполненных данных
															</Typography>
														)
													}

													// Отображаем все заполненные поля без группировки
													return (
														<>
															<Typography
																variant='caption'
																color='text.secondary'
																sx={{ mb: 2, display: 'block' }}
															>
																Заполнено полей: {filledFields.length}
															</Typography>
															<Box>
																{filledFields.map(
																	(field: any, index: number) => (
																		<Box
																			key={index}
																			sx={{
																				mb: 0.75,
																				display: 'flex',
																				alignItems: 'flex-start',
																				gap: 1,
																			}}
																		>
																			<Typography
																				variant='body2'
																				component='span'
																				sx={{
																					color: 'text.secondary',
																					minWidth: '140px',
																					flexShrink: 0,
																					fontSize: '0.875rem',
																				}}
																			>
																				{field.label}:
																			</Typography>
																			<Typography
																				variant='body2'
																				component='span'
																				sx={{
																					fontWeight:
																						field.type === 'header' ? 500 : 400,
																					color:
																						field.type === 'checkbox' &&
																						field.value.startsWith('✓')
																							? 'success.main'
																							: field.type === 'checkbox' &&
																							  field.value.startsWith('✗')
																							? 'text.disabled'
																							: 'text.primary',
																					wordBreak: 'break-word',
																					fontSize: '0.875rem',
																				}}
																			>
																				{field.value}
																			</Typography>
																		</Box>
																	)
																)}
															</Box>
														</>
													)
												})()}
											</Box>
										</CardContent>
									</Card>
								)}
						</Stack>
					)}
				</DialogContent>
				<DialogActions sx={{ p: { xs: 2, sm: 3 } }}>
					<Button onClick={() => setDetailsOpen(false)}>Закрыть</Button>
					{selectedSubmission && settings.allowUserEdit && (
						<Button
							variant='contained'
							onClick={() => {
								handleEditSubmission(selectedSubmission)
								setDetailsOpen(false)
							}}
						>
							Редактировать
						</Button>
					)}
				</DialogActions>
			</Dialog>
		</Container>
	)
}

export default MySubmissions
