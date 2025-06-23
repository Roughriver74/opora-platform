import React, { useState, useEffect } from 'react'
import {
	Box,
	Paper,
	Typography,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
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
	List,
	ListItem,
	ListItemText,
	ListItemIcon,
	Avatar,
	Divider,
	Stack,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	TextField,
	Alert,
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
	Person as PersonIcon,
	Schedule as ScheduleIcon,
	Note as NoteIcon,
	Edit as EditIcon,
	CheckCircle as CheckCircleIcon,
	Error as ErrorIcon,
	Pending as PendingIcon,
	Search as SearchIcon,
	FilterList as FilterIcon,
	ExpandMore as ExpandMoreIcon,
	ExpandLess as ExpandLessIcon,
	Visibility as VisibilityIcon,
	Phone as PhoneIcon,
	Email as EmailIcon,
	Business as BusinessIcon,
	Info as InfoIcon,
	Description as DescriptionIcon,
	FileCopy as FileCopyIcon,
	Close as CloseIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import SubmissionService from '../../../services/submissionService'
import { settingsService } from '../../../services/settingsService'
import { FormFieldService } from '../../../services/formFieldService'
import userService from '../../../services/userService'
import {
	Submission,
	SubmissionHistory,
	SubmissionFilters,
	BitrixStage,
} from '../../../services/submissionService'
import { FormField } from '../../../types'
import { useAuth } from '../../../contexts/auth'
import api from '../../../services/api'

// Константы перенесены в отдельный файл

const MySubmissions: React.FC = () => {
	const navigate = useNavigate()
	const { user } = useAuth()
	const theme = useTheme()
	const isMobile = useMediaQuery(theme.breakpoints.down('md'))
	const isSmallMobile = useMediaQuery('(max-width:480px)')

	// Состояния
	const [submissions, setSubmissions] = useState<Submission[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [selectedSubmission, setSelectedSubmission] =
		useState<Submission | null>(null)
	const [submissionHistory, setSubmissionHistory] = useState<
		SubmissionHistory[]
	>([])
	const [detailsOpen, setDetailsOpen] = useState(false)
	const [bitrixStages, setBitrixStages] = useState<BitrixStage[]>([])
	const [filters, setFilters] = useState<SubmissionFilters>({})
	const [page, setPage] = useState(0)
	const [rowsPerPage, setRowsPerPage] = useState(10)
	const [total, setTotal] = useState(0)
	const [formFields, setFormFields] = useState<FormField[]>([])
	const [users, setUsers] = useState<any[]>([])

	// Настройки системы
	const [settings, setSettings] = useState({
		enableCopying: true,
		allowUserStatusChange: true,
		allowUserEdit: true,
		copyButtonText: 'Копировать заявку',
	})
	const [filtersExpanded, setFiltersExpanded] = useState(false)

	// Проверяем, является ли пользователь администратором
	const isAdmin = user?.role === 'admin'

	// Загрузка настроек системы
	const loadSettings = async () => {
		try {
			const [
				enableCopying,
				allowUserStatusChange,
				allowUserEdit,
				copyButtonText,
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
			])

			setSettings({
				enableCopying,
				allowUserStatusChange,
				allowUserEdit,
				copyButtonText,
			})
		} catch (error) {
			console.error('Ошибка загрузки настроек:', error)
			// Используем значения по умолчанию при ошибке
		}
	}

	// Загрузка статусов из Битрикс24
	const loadBitrixStages = async () => {
		try {
			console.log('Загрузка статусов из Битрикс24...')
			const response = await SubmissionService.getBitrixDealStages('1') // Используем категорию 1
			console.log('Ответ от сервера:', response)

			if (response.success && response.data && response.data.length > 0) {
				console.log('Статусы загружены:', response.data)
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
			const response = await api.get('/users')
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
					page: page + 1,
					limit: rowsPerPage,
				})
			}

			setSubmissions(response.data)
			setTotal(response.pagination.total)
		} catch (err: any) {
			setError(err.message || 'Ошибка загрузки заявок')
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

	// Функция для редактирования заявки - НОВАЯ ЛОГИКА
	const handleEditSubmission = async (submission: Submission) => {
		try {
			console.log('🔥 [CLIENT EDIT] КНОПКА РЕДАКТИРОВАТЬ НАЖАТА!')
			console.log(
				'[CLIENT EDIT DEBUG] Начало редактирования заявки:',
				submission._id
			)
			console.log('[CLIENT EDIT DEBUG] Данные заявки:', submission)

			// Получаем заявку с актуальными данными из Битрикс24
			console.log(
				'[CLIENT EDIT DEBUG] Запрос актуальных данных из Битрикс24...'
			)
			const response = await SubmissionService.getSubmissionForEdit(
				submission._id
			)

			console.log('[CLIENT EDIT DEBUG] Ответ от сервера:', response)
			console.log('[CLIENT EDIT DEBUG] response.data:', response.data)
			console.log(
				'[CLIENT EDIT DEBUG] response.data.preloadedOptions:',
				response.data.preloadedOptions
			)

			if (response.success) {
				console.log('[CLIENT EDIT DEBUG] Успешно получены актуальные данные')
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
					submissionId: response.data._id,
					formId: response.data.formId?._id || submission.formId?._id,
					formData: response.data.formData,
					preloadedOptions: response.data.preloadedOptions || {},
				}

				console.log('[CLIENT EDIT DEBUG] Сохраняем в localStorage:', editData)
				localStorage.setItem('editSubmissionData', JSON.stringify(editData))

				console.log('[CLIENT EDIT DEBUG] Переход к форме редактирования...')
				navigate(`/?edit=${submission._id}`)
			} else {
				console.warn(
					'[CLIENT EDIT DEBUG] Не удалось получить актуальные данные'
				)
				// В случае ошибки используем локальные данные
				localStorage.setItem(
					'editSubmissionData',
					JSON.stringify({
						submissionId: submission._id,
						formId: submission.formId?._id || 'unknown',
						formData: {},
					})
				)
				navigate(`/?edit=${submission._id}`)
			}
		} catch (error: any) {
			console.error('[CLIENT EDIT DEBUG] Ошибка получения данных:', error)
			// В случае ошибки переходим к форме с пустыми данными
			localStorage.setItem(
				'editSubmissionData',
				JSON.stringify({
					submissionId: submission._id,
					formId: submission.formId?._id || 'unknown',
					formData: {},
				})
			)
			navigate(`/?edit=${submission._id}`)
		}
	}

	// Копирование заявки
	const handleCopySubmission = async (submission: Submission) => {
		try {
			console.log('🔥 [CLIENT COPY] КНОПКА КОПИРОВАТЬ НАЖАТА!')
			console.log('[CLIENT COPY] Копирование заявки:', submission._id)

			// Получаем данные заявки для копирования
			const response = await SubmissionService.copySubmission(submission._id)

			if (response.success) {
				console.log('[CLIENT COPY] Данные получены:', response.data)

				// Перенаправляем на форму с предзаполненными данными
				// Сохраняем данные в sessionStorage для передачи в форму
				sessionStorage.setItem(
					'copyFormData',
					JSON.stringify({
						formId: response.data.formId,
						formData: response.data.formData,
						isCopy: true,
						originalTitle: response.data.originalTitle,
						originalSubmissionNumber: response.data.originalSubmissionNumber,
					})
				)

				// Перенаправляем на главную страницу с параметром копирования
				navigate(`/?copy=${submission._id}`)
			}
		} catch (err: any) {
			console.error('[CLIENT COPY] Ошибка копирования:', err)
			setError(err.message || 'Ошибка копирования заявки')
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
			if (selectedSubmission && selectedSubmission._id === submissionId) {
				const response = await SubmissionService.getSubmissionById(submissionId)
				setSelectedSubmission(response.data.submission)
				setSubmissionHistory(response.data.history)
			}
		} catch (err: any) {
			setError(err.message || 'Ошибка изменения статуса')
		}
	}

	// Получение названия поля по его имени
	const getFieldLabel = (fieldName: string): string => {
		const field = formFields.find(f => f.name === fieldName)
		return field ? field.label : fieldName
	}

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

	const handleChangeRowsPerPage = (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
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

	// Применение фильтров
	const handleFilterChange = (newFilters: Partial<SubmissionFilters>) => {
		setFilters({ ...filters, ...newFilters })
		setPage(0)
	}

	// Отображение подробностей заявки
	const handleShowDetails = async (submission: Submission) => {
		try {
			const response = await SubmissionService.getSubmissionById(submission._id)
			setSelectedSubmission(response.data.submission)
			setSubmissionHistory(response.data.history)
			setDetailsOpen(true)
		} catch (err: any) {
			setError(err.message || 'Ошибка загрузки деталей заявки')
		}
	}

	// Получение значения поля заявки
	// Функция больше не нужна, так как formData убрано

	// Мобильная карточка заявки
	const SubmissionCard: React.FC<{ submission: Submission }> = ({
		submission,
	}) => {
		// Проверяем, является ли статус "Отгружено" (C1:WON)
		const isShipped = submission.status === 'C1:WON'

		return (
			<Card
				sx={{
					mb: 2,
					border: '1px solid',
					borderColor: 'divider',
					'&:hover': {
						boxShadow: 2,
						borderColor: 'primary.main',
					},
				}}
			>
				<CardContent sx={{ pb: 1 }}>
					{/* Заголовок карточки */}
					<Box
						sx={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'flex-start',
							mb: 2,
						}}
					>
						<Box>
							<Typography
								variant='h6'
								component='div'
								sx={{ fontWeight: 'bold', color: 'primary.main' }}
							>
								Bitrix ID: {submission.bitrixDealId || 'Не указан'}
							</Typography>
							<Typography variant='body2' color='text.secondary'>
								User:{' '}
								{submission.userId?.firstName && submission.userId?.lastName
									? `${submission.userId.firstName} ${submission.userId.lastName}`
									: submission.userId?.name || 'Анонимная заявка'}
							</Typography>
						</Box>
						<Chip
							label={getStatusName(submission.status)}
							color='primary'
							size='small'
							sx={{ ml: 1 }}
						/>
					</Box>

					{/* Основная информация */}
					<Stack spacing={1} sx={{ mb: 2 }}>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							<ScheduleIcon fontSize='small' color='action' />
							<Typography variant='body2'>
								{format(new Date(submission.createdAt), 'dd.MM.yyyy HH:mm', {
									locale: ru,
								})}
							</Typography>
						</Box>

						{/* Битрикс24 статус */}
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							<BusinessIcon fontSize='small' color='action' />
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
											? 'Синхронизировано'
											: submission.bitrixSyncStatus === 'failed'
											? 'Ошибка синхронизации'
											: 'Ожидает синхронизации'
									}
									color={
										submission.bitrixSyncStatus === 'synced'
											? 'success'
											: submission.bitrixSyncStatus === 'failed'
											? 'error'
											: 'warning'
									}
									size='small'
									variant='outlined'
								/>
							) : (
								<Chip
									label='Не создано в Битрикс24'
									color='default'
									size='small'
									variant='outlined'
								/>
							)}
						</Box>

						{/* Название заявки */}
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							<DescriptionIcon fontSize='small' color='action' />
							<Typography variant='body2' sx={{ fontWeight: 'medium' }}>
								{submission.title}
							</Typography>
						</Box>
					</Stack>

					{/* Действия */}
					<Box
						sx={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							mt: 2,
							pt: 1,
							borderTop: '1px solid',
							borderColor: 'divider',
						}}
					>
						<ButtonGroup size='small' variant='outlined'>
							<Button
								startIcon={<VisibilityIcon />}
								onClick={() => handleShowDetails(submission)}
							>
								{isSmallMobile ? '' : 'Подробнее'}
							</Button>
							{!isShipped && settings.allowUserEdit && (
								<Button
									startIcon={<EditIcon />}
									onClick={() => handleEditSubmission(submission)}
									color='primary'
								>
									{isSmallMobile ? '' : 'Редактировать'}
								</Button>
							)}
							{settings.enableCopying && (
								<Button
									startIcon={<FileCopyIcon />}
									onClick={() => handleCopySubmission(submission)}
									color='secondary'
								>
									{isSmallMobile ? '' : settings.copyButtonText}
								</Button>
							)}
						</ButtonGroup>

						{/* Смена статуса для всех пользователей */}
						{settings.allowUserStatusChange && (
							<FormControl size='small' sx={{ minWidth: 120 }}>
								<Select
									value={getCleanStatus(submission.status)}
									onChange={e =>
										handleStatusChange(submission._id, e.target.value)
									}
									displayEmpty
									renderValue={value => {
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
						)}
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

			{/* Фильтры */}
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
						Фильтры
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
							<TextField
								size='small'
								placeholder='Поиск по номеру заявки...'
								value={filters.search || ''}
								onChange={e => handleFilterChange({ search: e.target.value })}
								InputProps={{
									startAdornment: (
										<SearchIcon sx={{ mr: 1, color: 'action.active' }} />
									),
								}}
								sx={{ minWidth: { xs: '100%', sm: '200px' } }}
							/>

							{isAdmin && (
								<FormControl
									size='small'
									sx={{ minWidth: { xs: '100%', sm: '150px' } }}
								>
									<InputLabel>Клиент</InputLabel>
									<Select
										value={filters.userId || ''}
										label='Клиент'
										onChange={e =>
											handleFilterChange({ userId: e.target.value })
										}
									>
										<MenuItem value=''>Все клиенты</MenuItem>
										{users.map(user => (
											<MenuItem key={user._id} value={user._id}>
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
									onChange={e => handleFilterChange({ status: e.target.value })}
								>
									<MenuItem value=''>Все статусы</MenuItem>
									{bitrixStages.map(stage => (
										<MenuItem key={stage.id} value={stage.id}>
											{stage.name}
										</MenuItem>
									))}
								</Select>
							</FormControl>

							<Button
								variant='outlined'
								onClick={() => {
									setFilters({})
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
					{/* Отображение заявок */}
					{isMobile ? (
						// Мобильное отображение - карточки
						<Box>
							{submissions.map(submission => (
								<SubmissionCard key={submission._id} submission={submission} />
							))}
						</Box>
					) : (
						// Десктопное отображение - таблица
						<TableContainer component={Paper}>
							<Table>
								<TableHead>
									<TableRow>
										<TableCell>Bitrix ID</TableCell>
										<TableCell>User</TableCell>
										<TableCell>Статус</TableCell>
										<TableCell>Битрикс24</TableCell>
										<TableCell>Дата создания</TableCell>
										<TableCell>Действия</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{submissions.map(submission => {
										// Защита от некорректных данных
										if (!submission || !submission._id) {
											return null
										}

										// Проверяем, является ли статус "Отгружено" (C1:WON)
										const isShipped = submission.status === 'C1:WON'

										return (
											<TableRow key={submission._id}>
												<TableCell>
													<Typography variant='body2' fontWeight='bold'>
														{submission.bitrixDealId || 'Не указан'}
													</Typography>
												</TableCell>
												<TableCell>
													{submission.userId && (
														<Typography variant='body2'>
															{submission.userId.firstName &&
															submission.userId.lastName
																? `${submission.userId.firstName} ${submission.userId.lastName}`
																: submission.userId.name || 'Не указан'}
														</Typography>
													)}
													{!submission.userId && (
														<Typography variant='body2' color='text.secondary'>
															Анонимная заявка
														</Typography>
													)}
												</TableCell>
												<TableCell>
													<FormControl size='small' sx={{ minWidth: 120 }}>
														<Select
															value={getCleanStatus(submission.status)}
															onChange={e =>
																handleStatusChange(
																	submission._id,
																	e.target.value
																)
															}
															displayEmpty
															renderValue={value => {
																const statusName = getStatusName(
																	submission.status
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
												</TableCell>
												<TableCell>
													<Stack
														direction='row'
														spacing={1}
														alignItems='center'
													>
														{submission.bitrixDealId ? (
															<Tooltip
																title={`Сделка ID: ${submission.bitrixDealId}`}
															>
																<Chip
																	icon={
																		submission.bitrixSyncStatus === 'synced' ? (
																			<CheckCircleIcon />
																		) : submission.bitrixSyncStatus ===
																		  'failed' ? (
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
															</Tooltip>
														) : (
															<Chip
																label='Не создано'
																color='default'
																size='small'
															/>
														)}
													</Stack>
												</TableCell>
												<TableCell>
													{format(
														new Date(submission.createdAt),
														'dd.MM.yyyy HH:mm',
														{ locale: ru }
													)}
												</TableCell>
												<TableCell>
													<ButtonGroup size='small'>
														<IconButton
															onClick={() => handleShowDetails(submission)}
															color='info'
															title='Подробнее'
														>
															<VisibilityIcon />
														</IconButton>
														{!isShipped && settings.allowUserEdit && (
															<IconButton
																onClick={() => handleEditSubmission(submission)}
																color='primary'
																title='Редактировать заявку'
															>
																<EditIcon />
															</IconButton>
														)}
														{settings.enableCopying && (
															<IconButton
																onClick={() => handleCopySubmission(submission)}
																color='secondary'
																title='Копировать заявку'
															>
																<FileCopyIcon />
															</IconButton>
														)}
													</ButtonGroup>
												</TableCell>
											</TableRow>
										)
									})}
								</TableBody>
							</Table>
						</TableContainer>
					)}

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
								onChange={(_, newPage) => setPage(newPage - 1)}
								color='primary'
								size='small'
								showFirstButton
								showLastButton
							/>
						) : (
							<TablePagination
								rowsPerPageOptions={[5, 10, 25]}
								component='div'
								count={total}
								rowsPerPage={rowsPerPage}
								page={page}
								onPageChange={handleChangePage}
								onRowsPerPageChange={handleChangeRowsPerPage}
								labelRowsPerPage='Строк на странице:'
								labelDisplayedRows={({ from, to, count }) =>
									`${from}-${to} из ${count}`
								}
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
											<Typography variant='body2' color='text.secondary'>
												<strong>Форма:</strong>{' '}
												{selectedSubmission.formId?.title || 'Форма не найдена'}
											</Typography>
										</Box>
										<Box>
											<Typography
												variant='body2'
												color='text.secondary'
												component='span'
												sx={{ mb: 1, display: 'block' }}
											>
												<strong>Статус:</strong>
											</Typography>
											<FormControl size='small' sx={{ minWidth: 200 }}>
												<Select
													value={getCleanStatus(selectedSubmission.status)}
													onChange={e =>
														handleStatusChange(
															selectedSubmission._id,
															e.target.value
														)
													}
													displayEmpty
													renderValue={value => {
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
												<strong>Создано:</strong>{' '}
												{format(
													new Date(selectedSubmission.createdAt),
													'dd.MM.yyyy HH:mm',
													{ locale: ru }
												)}
											</Typography>
										</Box>
										{selectedSubmission.userId && (
											<Box>
												<Typography variant='body2' color='text.secondary'>
													<strong>Клиент:</strong>{' '}
													{selectedSubmission.userId?.firstName &&
													selectedSubmission.userId?.lastName
														? `${selectedSubmission.userId.firstName} ${selectedSubmission.userId.lastName}`
														: selectedSubmission.userId?.name || 'Не указан'}
												</Typography>
											</Box>
										)}
									</Stack>
								</CardContent>
							</Card>

							{/* Данные заявки */}
							<Card>
								<CardContent>
									<Typography variant='h6' gutterBottom>
										Название заявки
									</Typography>
									<Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
										<Typography variant='body1'>
											{selectedSubmission.title}
										</Typography>
									</Box>
									<Typography
										variant='body2'
										color='text.secondary'
										sx={{ mt: 1 }}
									>
										Подробные данные заявки отображаются в Битрикс24. Для полной
										информации используйте редактирование.
									</Typography>
								</CardContent>
							</Card>
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
