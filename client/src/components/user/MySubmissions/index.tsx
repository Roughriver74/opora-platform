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
import { DEFAULT_STATUS_FILTER } from './constants'

// Константы перенесены в отдельный файл

const MySubmissions = () => {
	const navigate = useNavigate()
	const { user } = useAuth()
	const { showError, showSuccess } = useNotificationHelpers()
	const theme = useTheme()
	const isMobile = useMediaQuery(theme.breakpoints.down('md'))
	const isSmallMobile = useMediaQuery('(max-width:480px)')

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
	})
	const [page, setPage] = useState(0)
	const [rowsPerPage, setRowsPerPage] = useState(10)
	const [total, setTotal] = useState(0)
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

	// Мобильная карточка заявки
	const SubmissionCard = ({ submission }: { submission: Submission }) => {
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
								{submission.userId?.first_name && submission.userId?.last_name
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
								{isSmallMobile ? '' : ''}
							</Button>
							{!isShipped && settings.allowUserEdit && (
								<Button
									startIcon={<EditIcon />}
									onClick={() => handleEditSubmission(submission)}
									color='primary'
								>
									{isSmallMobile ? '' : ''}
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
									value={submission.status}
									onChange={(e: any) =>
										handleStatusChange(submission.id, e.target.value)
									}
									displayEmpty
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
								onChange={(e: any) =>
									handleFilterChange({ search: e.target.value })
								}
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

							<Button
								variant='outlined'
								onClick={() => {
									setFilters({
										status: DEFAULT_STATUS_FILTER,
									})
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
								<SubmissionCard key={submission.id} submission={submission} />
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
										if (!submission || !submission.id) {
											return null
										}

										// Проверяем, является ли статус "Отгружено" (C1:WON)
										const isShipped = submission.status === 'C1:WON'

										return (
											<TableRow key={submission.id}>
												<TableCell>
													<Typography variant='body2' fontWeight='bold'>
														{submission.bitrixDealId || 'Не указан'}
													</Typography>
												</TableCell>
												<TableCell>
													{submission.userId && (
														<Typography variant='body2'>
															{submission.userId.first_name &&
															submission.userId.last_name
																? `${submission.userId.first_name} ${submission.userId.last_name}`
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
															onChange={(
																e: React.ChangeEvent<HTMLInputElement>
															) =>
																handleStatusChange(
																	submission.id,
																	e.target.value
																)
															}
															displayEmpty
															renderValue={(value: any) => {
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
								onChange={(_: any, newPage: number) => setPage(newPage - 1)}
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
