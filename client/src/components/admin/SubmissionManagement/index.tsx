import React, { useState, useEffect, useCallback } from 'react'
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
	TextField,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	Button,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Card,
	CardContent,
	Divider,
	List,
	ListItem,
	ListItemText,
	ListItemIcon,
	Avatar,
	Stack,
	Alert,
	Tooltip,
} from '@mui/material'
import {
	Visibility as ViewIcon,
	Edit as EditIcon,
	Search as SearchIcon,
	FilterList as FilterIcon,
	Person as PersonIcon,
	Schedule as ScheduleIcon,
	Assignment as AssignmentIcon,
	Note as NoteIcon,
	Sync as SyncIcon,
	CheckCircle as CheckCircleIcon,
	Error as ErrorIcon,
	Pending as PendingIcon,
} from '@mui/icons-material'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import submissionService, {
	Submission,
	SubmissionFilters,
	SubmissionHistory,
} from '../../../services/submissionService'

const statusLabels: Record<string, string> = {
	new: 'Новая',
	in_progress: 'В работе',
	completed: 'Завершена',
	cancelled: 'Отменена',
	on_hold: 'На паузе',
}

const statusColors: Record<
	string,
	'primary' | 'warning' | 'success' | 'error' | 'default'
> = {
	new: 'primary',
	in_progress: 'warning',
	completed: 'success',
	cancelled: 'error',
	on_hold: 'default',
} as const

const priorityColors = {
	low: 'default',
	medium: 'primary',
	high: 'warning',
	urgent: 'error',
} as const

const priorityLabels = {
	low: 'Низкий',
	medium: 'Средний',
	high: 'Высокий',
	urgent: 'Срочный',
}

const SubmissionManagement = () => {
	const [submissions, setSubmissions] = useState<Submission[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [page, setPage] = useState(0)
	const [rowsPerPage, setRowsPerPage] = useState(10)
	const [total, setTotal] = useState(0)
	const [filters, setFilters] = useState<SubmissionFilters>({})
	const [selectedSubmission, setSelectedSubmission] =
		useState<Submission | null>(null)
	const [submissionHistory, setSubmissionHistory] = useState<
		SubmissionHistory[]
	>([])
	const [detailsOpen, setDetailsOpen] = useState(false)
	const [formFields, setFormFields] = useState<any[]>([])
	const [statusComment, setStatusComment] = useState('')
	const [bitrixStages, setBitrixStages] = useState<
		{ id: string; name: string }[]
	>([])
	const [searchValue, setSearchValue] = useState('')
	const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(
		null
	)

	// Применение фильтров
	const handleFilterChange = useCallback(
		(newFilters: Partial<SubmissionFilters>) => {
			setFilters(prevFilters => ({ ...prevFilters, ...newFilters }))
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
				}
				handleFilterChange(newFilters)
			}, 500)

			setSearchTimeout(timeout)
		},
		[searchTimeout, handleFilterChange]
	)

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

	// Загрузка статусов при монтировании компонента
	useEffect(() => {
		loadBitrixStages()
	}, [])

	// Загрузка заявок
	const loadSubmissions = async () => {
		try {
			setLoading(true)
			const response = await submissionService.getSubmissions({
				...filters,
				page: page + 1,
				limit: rowsPerPage,
			})
			setSubmissions(response?.data || [])
			setTotal(response?.pagination?.total || 0)
		} catch (err: any) {
			setError(err.message || 'Ошибка загрузки заявок')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		loadSubmissions()
	}, [page, rowsPerPage, filters])

	// Cleanup timeout при размонтировании
	useEffect(() => {
		return () => {
			if (searchTimeout) {
				clearTimeout(searchTimeout)
			}
		}
	}, [searchTimeout])

	// Открытие деталей заявки
	const handleViewDetails = async (submission: Submission) => {
		try {
			const response = await submissionService.getSubmissionById(submission.id)
			setSelectedSubmission(response.data.submission)
			setSubmissionHistory(response.data.history)

			// Загружаем поля формы для отображения читаемых названий
			const formResponse = await fetch(`/api/forms/${submission.formId.id}`)
			if (formResponse.ok) {
				const formData = await formResponse.json()
				setFormFields(formData.data.fields || [])
			}

			setDetailsOpen(true)
		} catch (err: any) {
			setError(err.message || 'Ошибка загрузки деталей заявки')
		}
	}

	// Обновление статуса
	const handleStatusChange = async (
		submissionId: string,
		newStatus: string
	) => {
		try {
			await submissionService.updateStatus(
				submissionId,
				newStatus,
				statusComment
			)
			setStatusComment('')
			loadSubmissions()
			if (selectedSubmission && selectedSubmission.id === submissionId) {
				handleViewDetails(selectedSubmission)
			}
		} catch (err: any) {
			setError(err.message || 'Ошибка обновления статуса')
		}
	}

	// Получение названия поля по его имени
	const getFieldLabel = (fieldName: string): string => {
		const field = formFields.find(f => f.name === fieldName)
		return field ? field.label : fieldName
	}

	// Получение названия статуса из Битрикс24
	const getStatusName = (status: string): string => {
		const cleanStatus = status.includes(':') ? status.split(':')[1] : status
		const stage = bitrixStages.find(stage => stage.id === cleanStatus)
		return stage?.name || status
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
				<Typography>Загрузка заявок...</Typography>
			</Box>
		)
	}

	return (
		<Box>
			<Typography variant='h4' gutterBottom>
				Управление заявками
			</Typography>

			<Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
				Здесь можно просматривать все заявки и управлять их статусами.
				Редактирование заявок доступно пользователям в разделе "Мои заявки".
			</Typography>

			{/* Поиск - всегда активен */}
			<Paper sx={{ p: 2, mb: 2 }}>
				<TextField
					fullWidth
					label='Поиск по заявкам'
					placeholder='Поиск по номеру заявки, клиенту, названию или содержимому...'
					value={searchValue}
					onChange={handleSearchChange}
					InputProps={{
						startAdornment: <SearchIcon />,
					}}
				/>
			</Paper>

			{/* Дополнительные фильтры */}
			<Paper sx={{ p: 2, mb: 2 }}>
				<Stack
					direction={{ xs: 'column', sm: 'row' }}
					spacing={2}
					alignItems='center'
				>
					<FormControl sx={{ minWidth: 120 }}>
						<InputLabel>Статус</InputLabel>
						<Select
							value={filters.status || ''}
							onChange={(e: any) =>
								handleFilterChange({ status: e.target.value })
							}
						>
							<MenuItem value=''>Все</MenuItem>
							{bitrixStages.map(stage => (
								<MenuItem key={stage.id} value={stage.id}>
									{stage.name}
								</MenuItem>
							))}
						</Select>
					</FormControl>
					<FormControl sx={{ minWidth: 120 }}>
						<InputLabel>Приоритет</InputLabel>
						<Select
							value={filters.priority || ''}
							onChange={(e: any) =>
								handleFilterChange({ priority: e.target.value })
							}
						>
							<MenuItem value=''>Все</MenuItem>
							{Object.entries(priorityLabels).map(([value, label]) => (
								<MenuItem key={value} value={value}>
									{label}
								</MenuItem>
							))}
						</Select>
					</FormControl>
					<Button
						variant='outlined'
						startIcon={<FilterIcon />}
						onClick={() => setFilters({})}
					>
						Сбросить фильтры
					</Button>
				</Stack>
			</Paper>

			{/* Таблица заявок */}
			<TableContainer component={Paper}>
				<Table>
					<TableHead>
						<TableRow>
							<TableCell>№ заявки</TableCell>
							<TableCell>Форма</TableCell>
							<TableCell>Клиент</TableCell>
							<TableCell>Статус</TableCell>
							<TableCell>Приоритет</TableCell>
							<TableCell>Битрикс24</TableCell>
							<TableCell>Дата создания</TableCell>
							<TableCell>Действия</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{submissions.map(submission => (
							<TableRow key={submission.id}>
								<TableCell>{submission.submissionNumber}</TableCell>
								<TableCell>{submission.formId.title}</TableCell>
								<TableCell>
									{submission.userName || 'Анонимная заявка'}
								</TableCell>
								<TableCell>
									<Typography variant='body2'>
										{getStatusName(submission.status)}
									</Typography>
								</TableCell>
								<TableCell>
									<Chip
										label={priorityLabels[submission.priority]}
										color={priorityColors[submission.priority]}
										size='small'
									/>
								</TableCell>
								<TableCell>
									<Stack direction='row' spacing={1} alignItems='center'>
										{submission.bitrixDealId ? (
											<Tooltip title={`Сделка ID: ${submission.bitrixDealId}`}>
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
											</Tooltip>
										) : (
											<Chip label='Не создано' color='default' size='small' />
										)}
									</Stack>
								</TableCell>
								<TableCell>
									{format(new Date(submission.createdAt), 'dd.MM.yyyy HH:mm', {
										locale: ru,
									})}
								</TableCell>
								<TableCell>
									<IconButton
										onClick={() => handleViewDetails(submission)}
										color='primary'
									>
										<ViewIcon />
									</IconButton>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
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
			</TableContainer>

			{/* Диалог деталей заявки */}
			<Dialog
				open={detailsOpen}
				onClose={() => {
					setDetailsOpen(false)
					setStatusComment('')
				}}
				maxWidth='md'
				fullWidth
			>
				<DialogTitle>
					Заявка № {selectedSubmission?.submissionNumber}
				</DialogTitle>
				<DialogContent>
					{selectedSubmission && (
						<Box sx={{ mt: 2 }}>
							<Stack spacing={3}>
								{/* Основная информация */}
								<Card>
									<CardContent>
										<Typography variant='h6' gutterBottom>
											Основная информация
										</Typography>
										<Typography
											variant='body2'
											color='textSecondary'
											gutterBottom
										>
											Форма: {selectedSubmission.formId.title}
										</Typography>
										<Box sx={{ mb: 2 }}>
											<Typography
												variant='body2'
												color='textSecondary'
												component='span'
											>
												Статус:
											</Typography>
											<Chip
												label={getStatusName(selectedSubmission.status)}
												color='primary'
												size='small'
												sx={{ ml: 1 }}
											/>
											<Box
												sx={{
													mt: 1,
													display: 'flex',
													gap: 1,
													alignItems: 'center',
												}}
											>
												<FormControl size='small' sx={{ minWidth: 150 }}>
													<InputLabel>Изменить статус</InputLabel>
													<Select
														value=''
														onChange={(e: any) => {
															if (e.target.value) {
																handleStatusChange(
																	selectedSubmission.id,
																	e.target.value
																)
															}
														}}
													>
														{bitrixStages
															.filter(
																stage =>
																	stage.id !==
																	(selectedSubmission.status.includes(':')
																		? selectedSubmission.status.split(':')[1]
																		: selectedSubmission.status)
															)
															.map(stage => (
																<MenuItem key={stage.id} value={stage.id}>
																	{stage.name}
																</MenuItem>
															))}
													</Select>
												</FormControl>
												<TextField
													size='small'
													placeholder='Комментарий к изменению статуса'
													value={statusComment}
													onChange={(e: any) =>
														setStatusComment(e.target.value)
													}
													sx={{ flexGrow: 1 }}
												/>
											</Box>
										</Box>
										<Box sx={{ mb: 1 }}>
											<Typography
												variant='body2'
												color='textSecondary'
												component='span'
											>
												Приоритет:
											</Typography>
											<Chip
												label={priorityLabels[selectedSubmission.priority]}
												color={priorityColors[selectedSubmission.priority]}
												size='small'
												sx={{ ml: 1 }}
											/>
										</Box>
										<Typography variant='body2' color='textSecondary'>
											Создано:{' '}
											{format(
												new Date(selectedSubmission.createdAt),
												'dd.MM.yyyy HH:mm',
												{ locale: ru }
											)}
										</Typography>
										{selectedSubmission.assignedTo && (
											<Typography variant='body2' color='textSecondary'>
												Назначено: {selectedSubmission.assignedTo.name}
											</Typography>
										)}

										{/* Информация о синхронизации с Битрикс24 */}
										<Box sx={{ mt: 2 }}>
											<Typography
												variant='body2'
												color='textSecondary'
												gutterBottom
											>
												<Typography component='strong'>
													Интеграция с Битрикс24:
												</Typography>
											</Typography>
											<Stack direction='row' spacing={1} alignItems='center'>
												{selectedSubmission.bitrixDealId ? (
													<>
														<Chip
															icon={
																selectedSubmission.bitrixSyncStatus ===
																'synced' ? (
																	<CheckCircleIcon />
																) : selectedSubmission.bitrixSyncStatus ===
																  'failed' ? (
																	<ErrorIcon />
																) : (
																	<PendingIcon />
																)
															}
															label={
																selectedSubmission.bitrixSyncStatus === 'synced'
																	? 'Синхронизировано'
																	: selectedSubmission.bitrixSyncStatus ===
																	  'failed'
																	? 'Ошибка синхронизации'
																	: 'Ожидает синхронизации'
															}
															color={
																selectedSubmission.bitrixSyncStatus === 'synced'
																	? 'success'
																	: selectedSubmission.bitrixSyncStatus ===
																	  'failed'
																	? 'error'
																	: 'warning'
															}
															size='small'
														/>
														<Typography variant='body2' color='textSecondary'>
															ID сделки: {selectedSubmission.bitrixDealId}
														</Typography>
													</>
												) : (
													<Chip
														label='Сделка не создана в Битрикс24'
														color='default'
														size='small'
													/>
												)}
											</Stack>
										</Box>
									</CardContent>
								</Card>

								{/* Данные формы */}
								<Card>
									<CardContent>
										<Typography variant='h6' gutterBottom>
											Данные заявки
										</Typography>
										{selectedSubmission.formData && (
											<Box>
												{Object.entries(selectedSubmission.formData).map(([key, val]: [string, any]) => {
													// Табличная часть товаров
													if (Array.isArray(val) && val.length > 0 && val[0]?.nomenclatureId) {
														const grandTotal = val.reduce((sum: number, item: any) => sum + (item.total || 0), 0)
														const formatP = (p: number) => p.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
														return (
															<Box key={key} sx={{ mb: 2 }}>
																<Typography variant='subtitle2' sx={{ fontWeight: 600, mb: 1 }}>
																	{getFieldLabel(key)}
																</Typography>
																<TableContainer component={Paper} variant='outlined'>
																	<Table size='small'>
																		<TableHead>
																			<TableRow sx={{ bgcolor: 'grey.50' }}>
																				<TableCell sx={{ fontWeight: 600, width: 40 }}>#</TableCell>
																				<TableCell sx={{ fontWeight: 600 }}>Товар</TableCell>
																				<TableCell sx={{ fontWeight: 600, width: 80 }}>Артикул</TableCell>
																				<TableCell sx={{ fontWeight: 600, width: 70 }} align='right'>Кол-во</TableCell>
																				<TableCell sx={{ fontWeight: 600, width: 50 }}>Ед.</TableCell>
																				<TableCell sx={{ fontWeight: 600, width: 100 }} align='right'>Цена</TableCell>
																				{val.some((item: any) => item.discount > 0) && (
																					<TableCell sx={{ fontWeight: 600, width: 70 }} align='right'>Скидка</TableCell>
																				)}
																				<TableCell sx={{ fontWeight: 600, width: 110 }} align='right'>Сумма</TableCell>
																			</TableRow>
																		</TableHead>
																		<TableBody>
																			{val.map((item: any, idx: number) => (
																				<TableRow key={item.nomenclatureId || idx}>
																					<TableCell>{idx + 1}</TableCell>
																					<TableCell>{item.name}</TableCell>
																					<TableCell>{item.sku}</TableCell>
																					<TableCell align='right'>{item.quantity}</TableCell>
																					<TableCell>{item.unit}</TableCell>
																					<TableCell align='right'>{formatP(item.price)} ₽</TableCell>
																					{val.some((i: any) => i.discount > 0) && (
																						<TableCell align='right'>
																							{item.discount > 0 ? `${item.discount}%` : '—'}
																						</TableCell>
																					)}
																					<TableCell align='right' sx={{ fontWeight: 600 }}>
																						{formatP(item.total)} ₽
																					</TableCell>
																				</TableRow>
																			))}
																			<TableRow sx={{ bgcolor: 'grey.50' }}>
																				<TableCell colSpan={val.some((i: any) => i.discount > 0) ? 7 : 6} align='right' sx={{ fontWeight: 700 }}>
																					Итого:
																				</TableCell>
																				<TableCell align='right' sx={{ fontWeight: 700 }}>
																					{formatP(grandTotal)} ₽
																				</TableCell>
																			</TableRow>
																		</TableBody>
																	</Table>
																</TableContainer>
															</Box>
														)
													}
													// Обычные поля
													if (val === null || val === undefined || val === '') return null
													const displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val)
													return (
														<Box key={key} sx={{ mb: 1 }}>
															<Typography variant='body2' color='text.secondary' component='span'>
																{getFieldLabel(key)}:{' '}
															</Typography>
															<Typography variant='body2' component='span'>
																{displayVal}
															</Typography>
														</Box>
													)
												})}
											</Box>
										)}
									</CardContent>
								</Card>

								{/* История изменений */}
								<Card>
									<CardContent>
										<Typography variant='h6' gutterBottom>
											История изменений
										</Typography>
										<List>
											{submissionHistory.map((historyItem, index) => (
												<Box key={historyItem.id}>
													<ListItem>
														<ListItemIcon>
															<Avatar sx={{ width: 32, height: 32 }}>
																{historyItem.changeType === 'status_change' && (
																	<AssignmentIcon />
																)}
																{historyItem.changeType === 'assignment' && (
																	<PersonIcon />
																)}
																{historyItem.changeType === 'note_added' && (
																	<NoteIcon />
																)}
																{historyItem.changeType === 'data_update' && (
																	<EditIcon />
																)}
																<ScheduleIcon />
															</Avatar>
														</ListItemIcon>
														<ListItemText
															primary={historyItem.description}
															secondary={
																<>
																	{historyItem.changedBy.name} •{' '}
																	{format(
																		new Date(historyItem.changedAt),
																		'dd.MM.yyyy HH:mm',
																		{ locale: ru }
																	)}
																	{historyItem.comment && (
																		<>
																			<Typography component='br' />
																			<Typography component='em'>
																				Комментарий: {historyItem.comment}
																			</Typography>
																		</>
																	)}
																</>
															}
														/>
													</ListItem>
													{index < submissionHistory.length - 1 && <Divider />}
												</Box>
											))}
										</List>
									</CardContent>
								</Card>
							</Stack>
						</Box>
					)}
				</DialogContent>
				<DialogActions>
					<Button
						onClick={() => {
							setDetailsOpen(false)
							setStatusComment('')
						}}
					>
						Закрыть
					</Button>
				</DialogActions>
			</Dialog>

			{error && (
				<Typography color='error' sx={{ mt: 2 }}>
					{error}
				</Typography>
			)}
		</Box>
	)
}

export default SubmissionManagement
