import React, { useState, useEffect } from 'react'
import {
	Box,
	Paper,
	Typography,
	Button,
	Card,
	CardContent,
	CardActions,
	Alert,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Chip,
	TextField,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Stack,
	Accordion,
	AccordionSummary,
	AccordionDetails,
	List,
	ListItem,
	ListItemText,
	CircularProgress,
	Tabs,
	Tab,
} from '@mui/material'
import {
	ExpandMore as ExpandMoreIcon,
	Sync as SyncIcon,
	Settings as SettingsIcon,
	Check as CheckIcon,
	Error as ErrorIcon,
	Info as InfoIcon,
	People as PeopleIcon,
} from '@mui/icons-material'
import api from '../../../services/api'
import { UsersPage } from '../../../pages/admin/UsersPage'

interface TabPanelProps {
	children?: React.ReactNode
	index: number
	value: number
}

const TabPanel = (props: TabPanelProps) => {
	const { children, value, index, ...other } = props

	return (
		<div
			role='tabpanel'
			hidden={value !== index}
			id={`simple-tabpanel-${index}`}
			aria-labelledby={`simple-tab-${index}`}
			{...other}
		>
			{value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
		</div>
	)
}

const a11yProps = (index: number) => {
	return {
		id: `simple-tab-${index}`,
		'aria-controls': `simple-tabpanel-${index}`,
	}
}

interface BitrixStage {
	id: string
	name: string
	sort: number
	color?: string
	semantic?: string
}

interface BitrixCategory {
	id: string
	name: string
	sort: number
	isDefault: boolean
}

const BitrixIntegration: React.FC = () => {
	const [tabValue, setTabValue] = useState(0)
	const [loading, setLoading] = useState(false)
	const [stages, setStages] = useState<BitrixStage[]>([])
	const [categories, setCategories] = useState<BitrixCategory[]>([])
	const [selectedCategory, setSelectedCategory] = useState<string>('0')
	const [testDialogOpen, setTestDialogOpen] = useState(false)
	const [testSubmissionId, setTestSubmissionId] = useState('')
	const [testStatus, setTestStatus] = useState('')
	const [testResult, setTestResult] = useState<any>(null)
	const [error, setError] = useState<string | null>(null)

	// Обработчик изменения вкладки
	const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
		setTabValue(newValue)
	}

	// Загрузка категорий сделок
	const loadCategories = async () => {
		try {
			setLoading(true)
			setError(null)

			const response = await api.get('/forms/bitrix/deal-categories')
			if (response.data.success) {
				setCategories(response.data.data)
			} else {
				setError('Не удалось загрузить категории сделок')
			}
		} catch (err: any) {
			setError(err.response?.data?.message || 'Ошибка загрузки категорий')
		} finally {
			setLoading(false)
		}
	}

	// Загрузка статусов для выбранной категории
	const loadStages = async (categoryId: string = '0') => {
		try {
			setLoading(true)
			setError(null)

			const response = await api.get('/forms/bitrix/deal-stages', {
				params: { categoryId },
			})

			if (response.data.success) {
				setStages(response.data.data)
			} else {
				setError('Не удалось загрузить статусы сделок')
			}
		} catch (err: any) {
			setError(err.response?.data?.message || 'Ошибка загрузки статусов')
		} finally {
			setLoading(false)
		}
	}

	// Тестирование подключения
	const testConnection = async () => {
		try {
			setLoading(true)
			setError(null)

			const response = await api.get('/forms/bitrix/test-connection')

			if (response.data.success) {
				setError(null)
				alert('Подключение к Битрикс24 работает успешно!')
			} else {
				setError('Ошибка подключения к Битрикс24: ' + response.data.message)
			}
		} catch (err: any) {
			setError(
				'Ошибка подключения к Битрикс24: ' +
					(err.response?.data?.message || err.message)
			)
		} finally {
			setLoading(false)
		}
	}

	// Тестирование синхронизации
	const testSync = async () => {
		try {
			setLoading(true)
			setError(null)

			const response = await api.post('/forms/bitrix/test-sync', {
				submissionId: testSubmissionId,
				newStatus: testStatus,
			})

			setTestResult(response.data)
		} catch (err: any) {
			setError(err.response?.data?.message || 'Ошибка тестирования')
			setTestResult({
				success: false,
				message: err.response?.data?.message || 'Ошибка тестирования',
				error: err.message,
			})
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		loadCategories()
	}, [])

	useEffect(() => {
		if (categories.length > 0) {
			loadStages(selectedCategory)
		}
	}, [selectedCategory, categories])

	const statusMapping = {
		new: 'Новая',
		in_progress: 'В работе',
		completed: 'Завершена',
		cancelled: 'Отменена',
		on_hold: 'Приостановлена',
	}

	return (
		<Box>
			<Typography variant='h4' gutterBottom>
				<SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
				Администрирование системы
			</Typography>

			<Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
				Управление пользователями и настройка интеграции с Битрикс24
			</Typography>

			<Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
				<Tabs
					value={tabValue}
					onChange={handleTabChange}
					aria-label='admin tabs'
				>
					<Tab icon={<PeopleIcon />} label='Пользователи' {...a11yProps(0)} />
					<Tab
						icon={<SettingsIcon />}
						label='Интеграция Битрикс24'
						{...a11yProps(1)}
					/>
				</Tabs>
			</Box>

			<TabPanel value={tabValue} index={0}>
				<UsersPage />
			</TabPanel>

			<TabPanel value={tabValue} index={1}>
				{error && (
					<Alert severity='error' sx={{ mb: 2 }}>
						{error}
					</Alert>
				)}

				{/* Статус подключения */}
				<Card sx={{ mb: 3 }}>
					<CardContent>
						<Typography variant='h6' gutterBottom>
							Статус подключения
						</Typography>

						<Stack direction='row' spacing={2} alignItems='center'>
							{loading ? (
								<CircularProgress size={20} />
							) : categories.length > 0 ? (
								<>
									<CheckIcon color='success' />
									<Typography color='success.main'>
										Подключение активно. Найдено {categories.length} категорий
										сделок.
									</Typography>
								</>
							) : (
								<>
									<ErrorIcon color='error' />
									<Typography color='error.main'>
										Нет подключения к Битрикс24 или отсутствуют категории
										сделок.
									</Typography>
								</>
							)}
						</Stack>
					</CardContent>

					<CardActions>
						<Button
							startIcon={<SyncIcon />}
							onClick={loadCategories}
							disabled={loading}
						>
							Обновить статус
						</Button>
						<Button
							startIcon={<InfoIcon />}
							onClick={testConnection}
							disabled={loading}
							variant='outlined'
						>
							Тест подключения
						</Button>
					</CardActions>
				</Card>

				{/* Категории и статусы */}
				{categories.length > 0 && (
					<Accordion defaultExpanded>
						<AccordionSummary expandIcon={<ExpandMoreIcon />}>
							<Typography variant='h6'>Категории и статусы сделок</Typography>
						</AccordionSummary>
						<AccordionDetails>
							<Stack spacing={2}>
								<FormControl fullWidth>
									<InputLabel>Категория сделок</InputLabel>
									<Select
										value={selectedCategory}
										onChange={e => setSelectedCategory(e.target.value)}
									>
										{categories.map(category => (
											<MenuItem key={category.id} value={category.id}>
												{category.name} {category.isDefault && '(по умолчанию)'}
											</MenuItem>
										))}
									</Select>
								</FormControl>

								{stages.length > 0 && (
									<TableContainer component={Paper}>
										<Table size='small'>
											<TableHead>
												<TableRow>
													<TableCell>ID статуса</TableCell>
													<TableCell>Название</TableCell>
													<TableCell>Сортировка</TableCell>
													<TableCell>Семантика</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{stages.map(stage => (
													<TableRow key={stage.id}>
														<TableCell>
															<code>{stage.id}</code>
														</TableCell>
														<TableCell>{stage.name}</TableCell>
														<TableCell>{stage.sort}</TableCell>
														<TableCell>
															{stage.semantic && (
																<Chip
																	label={stage.semantic}
																	size='small'
																	color={
																		stage.semantic === 'S'
																			? 'success'
																			: stage.semantic === 'F'
																			? 'error'
																			: 'default'
																	}
																/>
															)}
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</TableContainer>
								)}
							</Stack>
						</AccordionDetails>
					</Accordion>
				)}

				{/* Сопоставление статусов */}
				<Accordion>
					<AccordionSummary expandIcon={<ExpandMoreIcon />}>
						<Typography variant='h6'>Сопоставление статусов</Typography>
					</AccordionSummary>
					<AccordionDetails>
						<Alert severity='info' sx={{ mb: 2 }}>
							<Typography variant='body2'>
								Система автоматически сопоставляет наши статусы с подходящими
								статусами в Битрикс24. Алгоритм сначала ищет точные совпадения
								по ID, затем по названию.
							</Typography>
						</Alert>

						<List>
							{Object.entries(statusMapping).map(([key, value]) => (
								<ListItem key={key}>
									<ListItemText
										primary={`${value} (${key})`}
										secondary='Автоматическое сопоставление с подходящим статусом в Битрикс24'
									/>
								</ListItem>
							))}
						</List>
					</AccordionDetails>
				</Accordion>

				{/* Тестирование синхронизации */}
				<Card sx={{ mt: 3 }}>
					<CardContent>
						<Typography variant='h6' gutterBottom>
							Тестирование синхронизации
						</Typography>
						<Typography variant='body2' color='text.secondary' gutterBottom>
							Проверьте работу синхронизации статусов с конкретной заявкой
						</Typography>
					</CardContent>
					<CardActions>
						<Button variant='contained' onClick={() => setTestDialogOpen(true)}>
							Тестировать синхронизацию
						</Button>
					</CardActions>
				</Card>

				{/* Диалог тестирования */}
				<Dialog
					open={testDialogOpen}
					onClose={() => {
						setTestDialogOpen(false)
						setTestResult(null)
						setTestSubmissionId('')
						setTestStatus('')
					}}
					maxWidth='sm'
					fullWidth
				>
					<DialogTitle>Тестирование синхронизации</DialogTitle>
					<DialogContent>
						<Stack spacing={2} sx={{ mt: 1 }}>
							<TextField
								label='ID заявки'
								value={testSubmissionId}
								onChange={e => setTestSubmissionId(e.target.value)}
								fullWidth
								helperText='Введите ID заявки, у которой есть привязанная сделка в Битрикс24'
							/>

							<FormControl fullWidth>
								<InputLabel>Новый статус</InputLabel>
								<Select
									value={testStatus}
									onChange={e => setTestStatus(e.target.value)}
								>
									{Object.entries(statusMapping).map(([key, value]) => (
										<MenuItem key={key} value={key}>
											{value}
										</MenuItem>
									))}
								</Select>
							</FormControl>

							{testResult && (
								<Alert
									severity={testResult.success ? 'success' : 'error'}
									sx={{ mt: 2 }}
								>
									<Typography variant='body2'>{testResult.message}</Typography>
									{testResult.data && (
										<Box sx={{ mt: 1 }}>
											<Typography variant='caption' component='div'>
												ID заявки: {testResult.data.submissionId}
											</Typography>
											<Typography variant='caption' component='div'>
												ID сделки: {testResult.data.bitrixDealId}
											</Typography>
											<Typography variant='caption' component='div'>
												Новый статус: {testResult.data.newStatus}
											</Typography>
										</Box>
									)}
								</Alert>
							)}
						</Stack>
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setTestDialogOpen(false)}>Закрыть</Button>
						<Button
							variant='contained'
							onClick={testSync}
							disabled={!testSubmissionId || !testStatus || loading}
						>
							{loading ? <CircularProgress size={20} /> : 'Тестировать'}
						</Button>
					</DialogActions>
				</Dialog>
			</TabPanel>
		</Box>
	)
}

export default BitrixIntegration
