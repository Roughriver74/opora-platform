import React, { useState, useEffect } from 'react'
import {
	Box,
	Typography,
	Paper,
	Button,
	Avatar,
	Divider,
	Grid,
	Card,
	CardContent,
	CircularProgress,
	Stack,
	useTheme,
	useMediaQuery,
	Container,
} from '@mui/material'
import {
	Person as PersonIcon,
	CalendarToday,
	CheckCircle,
	PendingActions,
	AdminPanelSettings,
	Error as ErrorIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useQuery } from '@tanstack/react-query'
import { visitService, VisitStatus } from '../services/visitService'
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
	PieChart,
	Pie,
	Cell,
} from 'recharts'

interface UserProfile {
	id?: number
	email: string
	bitrix_user_id: number
	name?: string
	is_admin?: boolean
}

// Интерфейс для статистики визитов
interface VisitStats {
	planned: number
	completed: number
	failed: number
	total: number
}

// Интерфейс для данных по ежемесячной статистике
interface MonthlyStats {
	month: string
	visits: number
}

export const ProfilePage: React.FC = () => {
	const theme = useTheme()
	const isMobile = useMediaQuery(theme.breakpoints.down('md'))
	const navigate = useNavigate()
	const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
	const [visitStats, setVisitStats] = useState<VisitStats>({
		planned: 0,
		completed: 0,
		failed: 0,
		total: 0,
	})
	const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([])

	// Цвета для графиков
	const COLORS = {
		planned: theme.palette.info.main,
		completed: theme.palette.success.main,
		failed: theme.palette.error.main,
	}

	// Получаем данные профиля пользователя
	const {
		data: profileData,
		isLoading: isProfileLoading,
		error: profileError,
	} = useQuery({
		queryKey: ['userProfile'],
		queryFn: async () => {
			const response = await api.get('/profile')
			return response.data
		},
		retry: false,
		onError: () => {
			// В случае ошибки (например, истек токен), перенаправляем на страницу авторизации
			localStorage.removeItem('token')
			navigate('/auth')
		},
	})

	// Получаем все визиты для построения статистики
	const { data: visitsData, isLoading: isVisitsLoading } = useQuery({
		queryKey: ['visits'],
		queryFn: async () => {
			return await visitService.getVisits()
		},
		retry: 1,
		enabled: !!userProfile, // Загружаем только если профиль уже получен
	})

	// Обрабатываем данные профиля
	useEffect(() => {
		if (profileData) {
			setUserProfile(profileData)
		}
	}, [profileData])

	// Обрабатываем данные визитов для создания статистики
	useEffect(() => {
		if (visitsData && visitsData.length > 0) {
			// Рассчитываем статистику по статусам
			const stats: VisitStats = {
				planned: 0,
				completed: 0,
				failed: 0,
				total: visitsData.length,
			}

			visitsData.forEach(visit => {
				if (visit.status === VisitStatus.planned) stats.planned++
				else if (visit.status === VisitStatus.completed) stats.completed++
				else if (visit.status === VisitStatus.failed) stats.failed++
			})

			setVisitStats(stats)

			// Создаем данные для ежемесячной статистики
			// Группируем визиты по месяцам
			const monthVisits: Record<string, number> = {}

			visitsData.forEach(visit => {
				const date = new Date(visit.date)
				const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`

				if (monthVisits[monthYear]) {
					monthVisits[monthYear]++
				} else {
					monthVisits[monthYear] = 1
				}
			})

			// Преобразуем в формат для графика
			const months: MonthlyStats[] = Object.keys(monthVisits).map(key => {
				const [month, year] = key.split('/')
				const monthNames = [
					'Янв',
					'Фев',
					'Мар',
					'Апр',
					'Май',
					'Июн',
					'Июл',
					'Авг',
					'Сен',
					'Окт',
					'Ноя',
					'Дек',
				]
				return {
					month: `${monthNames[parseInt(month) - 1]} ${year}`,
					visits: monthVisits[key],
				}
			})

			// Сортируем по дате
			months.sort((a, b) => {
				const [monthA, yearA] = a.month.split(' ')
				const [monthB, yearB] = b.month.split(' ')

				if (yearA !== yearB) {
					return parseInt(yearA) - parseInt(yearB)
				}

				const monthIndex = (month: string) => {
					return [
						'Янв',
						'Фев',
						'Мар',
						'Апр',
						'Май',
						'Июн',
						'Июл',
						'Авг',
						'Сен',
						'Окт',
						'Ноя',
						'Дек',
					].indexOf(month)
				}

				return monthIndex(monthA) - monthIndex(monthB)
			})

			setMonthlyStats(months)
		}
	}, [visitsData])

	const handleLogout = () => {
		localStorage.removeItem('token')
		navigate('/auth')
	}

	const handleAdminPanelClick = () => {
		navigate('/admin/field-mappings')
	}

	const handleVisitsClick = () => {
		navigate('/visits')
	}

	// Данные для круговой диаграммы статусов визитов
	const pieChartData = [
		{ name: 'Запланировано', value: visitStats.planned, color: COLORS.planned },
		{ name: 'Выполнено', value: visitStats.completed, color: COLORS.completed },
		{ name: 'Провалено', value: visitStats.failed, color: COLORS.failed },
	]

	if (isProfileLoading) {
		return (
			<Box
				sx={{
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					height: '80vh',
				}}
			>
				<CircularProgress />
				<Typography sx={{ ml: 2 }}>Загрузка данных профиля...</Typography>
			</Box>
		)
	}

	if (profileError) {
		return (
			<Box sx={{ p: 3 }}>
				<Typography color='error'>Ошибка загрузки профиля</Typography>
			</Box>
		)
	}

	return (
		<Container maxWidth='lg'>
			<Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
				<Typography variant='h4' gutterBottom>
					Личный кабинет
				</Typography>

				<Grid container spacing={3}>
					{/* Профиль пользователя */}
					<Grid item xs={12} md={4}>
						<Paper sx={{ p: { xs: 2, md: 3 }, mb: 3 }}>
							<Box
								sx={{
									display: 'flex',
									flexDirection: 'column',
									alignItems: 'center',
									mb: 2,
								}}
							>
								<Avatar
									sx={{
										width: 100,
										height: 100,
										mb: 2,
										bgcolor: 'primary.main',
									}}
								>
									{userProfile?.email?.charAt(0).toUpperCase() || (
										<PersonIcon />
									)}
								</Avatar>
								<Typography variant='h6'>
									{userProfile?.name || userProfile?.email}
								</Typography>
								<Typography variant='body2' color='text.secondary'>
									{userProfile?.email}
								</Typography>
								<Typography variant='body2' color='text.secondary'>
									ID в Bitrix24: {userProfile?.bitrix_user_id}
								</Typography>
								{userProfile?.is_admin && (
									<Typography
										variant='body2'
										sx={{ mt: 1, color: 'primary.main' }}
									>
										Администратор
									</Typography>
								)}
							</Box>

							<Divider sx={{ my: 2 }} />

							<Stack spacing={2}>
								<Button
									variant='outlined'
									fullWidth
									onClick={handleVisitsClick}
									startIcon={<CalendarToday />}
								>
									Мои визиты
								</Button>

								<Button
									variant='contained'
									color='primary'
									fullWidth
									onClick={handleLogout}
								>
									Выйти из системы
								</Button>
							</Stack>
						</Paper>
					</Grid>

					{/* Статистика и графики */}
					<Grid item xs={12} md={8}>
						{/* Карточки со статистикой */}
						<Card sx={{ mb: 3 }}>
							<CardContent>
								<Typography variant='h6' gutterBottom>
									Статистика визитов
								</Typography>

								{isVisitsLoading ? (
									<Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
										<CircularProgress size={24} />
										<Typography sx={{ ml: 2 }}>
											Загрузка статистики...
										</Typography>
									</Box>
								) : (
									<Grid container spacing={2} sx={{ mt: 1 }}>
										<Grid item xs={6} sm={4}>
											<Card
												variant='outlined'
												sx={{ bgcolor: 'background.paper' }}
											>
												<CardContent>
													<Stack
														direction='row'
														spacing={1}
														alignItems='center'
													>
														<PendingActions sx={{ color: COLORS.planned }} />
														<Typography variant='subtitle1'>
															Запланировано
														</Typography>
													</Stack>
													<Typography
														variant='h3'
														align='center'
														sx={{ mt: 2 }}
													>
														{visitStats.planned}
													</Typography>
												</CardContent>
											</Card>
										</Grid>

										<Grid item xs={6} sm={4}>
											<Card
												variant='outlined'
												sx={{ bgcolor: 'background.paper' }}
											>
												<CardContent>
													<Stack
														direction='row'
														spacing={1}
														alignItems='center'
													>
														<CheckCircle sx={{ color: COLORS.completed }} />
														<Typography variant='subtitle1'>
															Выполнено
														</Typography>
													</Stack>
													<Typography
														variant='h3'
														align='center'
														sx={{ mt: 2 }}
													>
														{visitStats.completed}
													</Typography>
												</CardContent>
											</Card>
										</Grid>

										<Grid item xs={6} sm={4}>
											<Card
												variant='outlined'
												sx={{ bgcolor: 'background.paper' }}
											>
												<CardContent>
													<Stack
														direction='row'
														spacing={1}
														alignItems='center'
													>
														<ErrorIcon sx={{ color: COLORS.failed }} />
														<Typography variant='subtitle1'>
															Провалено
														</Typography>
													</Stack>
													<Typography
														variant='h3'
														align='center'
														sx={{ mt: 2 }}
													>
														{visitStats.failed}
													</Typography>
												</CardContent>
											</Card>
										</Grid>

										<Grid item xs={6} sm={12}>
											<Card
												variant='outlined'
												sx={{ bgcolor: 'background.paper' }}
											>
												<CardContent>
													<Stack
														direction='row'
														spacing={1}
														alignItems='center'
													>
														<CalendarToday color='primary' />
														<Typography variant='subtitle1'>Всего</Typography>
													</Stack>
													<Typography
														variant='h3'
														align='center'
														sx={{ mt: 2 }}
													>
														{visitStats.total}
													</Typography>
												</CardContent>
											</Card>
										</Grid>
									</Grid>
								)}
							</CardContent>
						</Card>

						{/* График: распределение по статусам */}
						<Card sx={{ mb: 3 }}>
							<CardContent>
								<Typography variant='h6' gutterBottom>
									Распределение визитов по статусам
								</Typography>

								{isVisitsLoading ? (
									<Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
										<CircularProgress size={24} />
									</Box>
								) : (
									<Box sx={{ height: 300, width: '100%' }}>
										<ResponsiveContainer width='100%' height='100%'>
											<PieChart>
												<Pie
													data={pieChartData}
													cx='50%'
													cy='50%'
													labelLine={true}
													label={({ name, percent }) =>
														`${name}: ${(percent * 100).toFixed(0)}%`
													}
													outerRadius={80}
													fill='#8884d8'
													dataKey='value'
												>
													{pieChartData.map((entry, index) => (
														<Cell key={`cell-${index}`} fill={entry.color} />
													))}
												</Pie>
												<Tooltip
													formatter={value => [
														`${value} визитов`,
														'Количество',
													]}
												/>
												<Legend />
											</PieChart>
										</ResponsiveContainer>
									</Box>
								)}
							</CardContent>
						</Card>

						{/* График: визиты по месяцам */}
						<Card sx={{ mb: 3 }}>
							<CardContent>
								<Typography variant='h6' gutterBottom>
									Динамика визитов по месяцам
								</Typography>

								{isVisitsLoading || monthlyStats.length === 0 ? (
									<Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
										<CircularProgress size={24} />
									</Box>
								) : (
									<Box sx={{ height: 300, width: '100%' }}>
										<ResponsiveContainer width='100%' height='100%'>
											<BarChart
												data={monthlyStats}
												margin={{
													top: 20,
													right: 30,
													left: 20,
													bottom: 5,
												}}
											>
												<CartesianGrid strokeDasharray='3 3' />
												<XAxis dataKey='month' />
												<YAxis />
												<Tooltip
													formatter={value => [
														`${value} визитов`,
														'Количество',
													]}
												/>
												<Legend />
												<Bar
													dataKey='visits'
													name='Визиты'
													fill={theme.palette.primary.main}
												/>
											</BarChart>
										</ResponsiveContainer>
									</Box>
								)}
							</CardContent>
						</Card>

						{/* Недавняя активность */}
						<Card>
							<CardContent>
								<Typography variant='h6' gutterBottom>
									Недавняя активность
								</Typography>
								{isVisitsLoading ? (
									<Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
										<CircularProgress size={24} />
									</Box>
								) : visitsData && visitsData.length > 0 ? (
									<Stack spacing={2}>
										{visitsData.slice(0, 5).map(visit => (
											<Paper
												key={visit.id}
												elevation={0}
												variant='outlined'
												sx={{ p: 2 }}
											>
												<Grid container spacing={2}>
													<Grid item xs={2} sm={1}>
														<Avatar
															sx={{
																bgcolor:
																	visit.status === VisitStatus.completed
																		? COLORS.completed
																		: visit.status === VisitStatus.planned
																		? COLORS.planned
																		: COLORS.failed,
															}}
														>
															{visit.status === VisitStatus.completed ? (
																<CheckCircle />
															) : visit.status === VisitStatus.planned ? (
																<PendingActions />
															) : (
																<ErrorIcon />
															)}
														</Avatar>
													</Grid>
													<Grid item xs={10} sm={11}>
														<Typography variant='subtitle1'>
															{visit.visit_type || 'Визит'}{' '}
															{new Date(visit.date).toLocaleDateString('ru-RU')}
														</Typography>
														<Typography variant='body2'>
															{visit.company?.name || 'Компания не указана'}
														</Typography>
														{visit.company?.address && (
															<Typography
																variant='body2'
																color='text.secondary'
															>
																{visit.company.address}
															</Typography>
														)}
													</Grid>
												</Grid>
											</Paper>
										))}
										<Button
											variant='text'
											onClick={handleVisitsClick}
											sx={{ alignSelf: 'center' }}
										>
											Смотреть все визиты
										</Button>
									</Stack>
								) : (
									<Typography variant='body2'>
										У вас еще нет визитов. Создайте новый визит, чтобы он
										появился здесь.
									</Typography>
								)}
							</CardContent>
						</Card>
					</Grid>
				</Grid>
			</Box>
		</Container>
	)
}
