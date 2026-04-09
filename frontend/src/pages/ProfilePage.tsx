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
		<Box sx={{ pb: 10, minHeight: '100%', bgcolor: 'background.default' }}>
			{/* Mobile Header */}
			<Box
				sx={{
					px: 2,
					pt: 1.5,
					pb: 1.5,
					position: 'sticky',
					top: 0,
					zIndex: 100,
					bgcolor: 'background.paper',
					boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
					mb: 2,
				}}
			>
				<Typography variant='h6' sx={{ fontWeight: 600 }}>
					Личный кабинет
				</Typography>
			</Box>

			<Box sx={{ px: { xs: 2, md: 3 }, maxWidth: 800, mx: 'auto' }}>
				{/* Profile Card */}
				<Card variant='outlined' sx={{ borderRadius: 3, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', mb: 3 }}>
					<CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
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
									width: 80,
									height: 80,
									mb: 1.5,
									bgcolor: 'primary.main',
									fontSize: '2rem',
								}}
							>
								{userProfile?.email?.charAt(0).toUpperCase() || (
									<PersonIcon fontSize='large' />
								)}
							</Avatar>
							<Typography variant='h6' sx={{ fontWeight: 600 }}>
								{userProfile?.name || userProfile?.email}
							</Typography>
							<Typography variant='body2' color='text.secondary'>
								{userProfile?.email}
							</Typography>
							<Typography variant='caption' color='text.secondary' sx={{ mt: 0.5 }}>
								Bitrix ID: {userProfile?.bitrix_user_id}
							</Typography>
							{userProfile?.is_admin && (
								<Typography
									variant='caption'
									sx={{ mt: 0.5, color: 'primary.main', fontWeight: 600 }}
								>
									Администратор
								</Typography>
							)}
						</Box>

						<Divider sx={{ my: 2 }} />

						<Stack spacing={1.5}>
							<Button
								variant='outlined'
								fullWidth
								onClick={handleVisitsClick}
								startIcon={<CalendarToday />}
								sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 500 }}
							>
								Мои визиты
							</Button>

							{userProfile?.is_admin && (
								<Button
									variant='outlined'
									fullWidth
									onClick={handleAdminPanelClick}
									startIcon={<AdminPanelSettings />}
									sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 500 }}
								>
									Админ панель
								</Button>
							)}

							<Button
								variant='contained'
								color='error'
								fullWidth
								onClick={handleLogout}
								sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 500 }}
							>
								Выйти из системы
							</Button>
						</Stack>
					</CardContent>
				</Card>

				{/* Statistics Section */}
				<Card variant='outlined' sx={{ borderRadius: 3, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', mb: 3 }}>
					<CardContent>
						<Typography variant='subtitle1' sx={{ fontWeight: 600, mb: 2 }}>
							Статистика визитов
						</Typography>

						{isVisitsLoading ? (
							<Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
								<CircularProgress size={24} />
							</Box>
						) : (
							<Grid container spacing={1.5}>
								<Grid item xs={6}>
									<Box sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 1.5, textAlign: 'center' }}>
										<PendingActions sx={{ color: COLORS.planned, fontSize: 28 }} />
										<Typography variant='h5' sx={{ fontWeight: 700, mt: 0.5 }}>
											{visitStats.planned}
										</Typography>
										<Typography variant='caption' color='text.secondary'>
											Запланировано
										</Typography>
									</Box>
								</Grid>
								<Grid item xs={6}>
									<Box sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 1.5, textAlign: 'center' }}>
										<CheckCircle sx={{ color: COLORS.completed, fontSize: 28 }} />
										<Typography variant='h5' sx={{ fontWeight: 700, mt: 0.5 }}>
											{visitStats.completed}
										</Typography>
										<Typography variant='caption' color='text.secondary'>
											Выполнено
										</Typography>
									</Box>
								</Grid>
								<Grid item xs={6}>
									<Box sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 1.5, textAlign: 'center' }}>
										<ErrorIcon sx={{ color: COLORS.failed, fontSize: 28 }} />
										<Typography variant='h5' sx={{ fontWeight: 700, mt: 0.5 }}>
											{visitStats.failed}
										</Typography>
										<Typography variant='caption' color='text.secondary'>
											Провалено
										</Typography>
									</Box>
								</Grid>
								<Grid item xs={6}>
									<Box sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 1.5, textAlign: 'center' }}>
										<CalendarToday color='primary' sx={{ fontSize: 28 }} />
										<Typography variant='h5' sx={{ fontWeight: 700, mt: 0.5 }}>
											{visitStats.total}
										</Typography>
										<Typography variant='caption' color='text.secondary'>
											Всего
										</Typography>
									</Box>
								</Grid>
							</Grid>
						)}
					</CardContent>
				</Card>

				{/* Pie Chart */}
				<Card variant='outlined' sx={{ borderRadius: 3, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', mb: 3 }}>
					<CardContent>
						<Typography variant='subtitle1' sx={{ fontWeight: 600, mb: 1 }}>
							Распределение по статусам
						</Typography>

						{isVisitsLoading ? (
							<Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
								<CircularProgress size={24} />
							</Box>
						) : (
							<Box sx={{ height: 260, width: '100%' }}>
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

				{/* Bar Chart */}
				<Card variant='outlined' sx={{ borderRadius: 3, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', mb: 3 }}>
					<CardContent>
						<Typography variant='subtitle1' sx={{ fontWeight: 600, mb: 1 }}>
							Динамика по месяцам
						</Typography>

						{isVisitsLoading || monthlyStats.length === 0 ? (
							<Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
								<CircularProgress size={24} />
							</Box>
						) : (
							<Box sx={{ height: 260, width: '100%' }}>
								<ResponsiveContainer width='100%' height='100%'>
									<BarChart
										data={monthlyStats}
										margin={{
											top: 20,
											right: 10,
											left: 0,
											bottom: 5,
										}}
									>
										<CartesianGrid strokeDasharray='3 3' />
										<XAxis dataKey='month' tick={{ fontSize: 11 }} />
										<YAxis tick={{ fontSize: 11 }} />
										<Tooltip
											formatter={value => [
												`${value} визитов`,
												'Количество',
											]}
										/>
										<Bar
											dataKey='visits'
											name='Визиты'
											fill={theme.palette.primary.main}
											radius={[4, 4, 0, 0]}
										/>
									</BarChart>
								</ResponsiveContainer>
							</Box>
						)}
					</CardContent>
				</Card>

				{/* Recent Activity */}
				<Card variant='outlined' sx={{ borderRadius: 3, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', mb: 3 }}>
					<CardContent>
						<Typography variant='subtitle1' sx={{ fontWeight: 600, mb: 2 }}>
							Недавняя активность
						</Typography>
						{isVisitsLoading ? (
							<Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
								<CircularProgress size={24} />
							</Box>
						) : visitsData && visitsData.length > 0 ? (
							<Stack spacing={1.5}>
								{visitsData.slice(0, 5).map(visit => (
									<Box
										key={visit.id}
										sx={{
											display: 'flex',
											alignItems: 'center',
											gap: 1.5,
											p: 1.5,
											bgcolor: 'action.hover',
											borderRadius: 2,
										}}
									>
										<Avatar
											sx={{
												width: 36,
												height: 36,
												bgcolor:
													visit.status === VisitStatus.completed
														? COLORS.completed
														: visit.status === VisitStatus.planned
														? COLORS.planned
														: COLORS.failed,
											}}
										>
											{visit.status === VisitStatus.completed ? (
												<CheckCircle fontSize='small' />
											) : visit.status === VisitStatus.planned ? (
												<PendingActions fontSize='small' />
											) : (
												<ErrorIcon fontSize='small' />
											)}
										</Avatar>
										<Box sx={{ flex: 1, minWidth: 0 }}>
											<Typography variant='body2' sx={{ fontWeight: 600, lineHeight: 1.3 }} noWrap>
												{visit.company?.name || 'Компания не указана'}
											</Typography>
											<Typography variant='caption' color='text.secondary'>
												{new Date(visit.date).toLocaleDateString('ru-RU')}
											</Typography>
										</Box>
									</Box>
								))}
								<Button
									variant='text'
									onClick={handleVisitsClick}
									sx={{ alignSelf: 'center', textTransform: 'none' }}
								>
									Смотреть все визиты
								</Button>
							</Stack>
						) : (
							<Typography variant='body2' color='text.secondary'>
								У вас еще нет визитов. Создайте новый визит, чтобы он
								появился здесь.
							</Typography>
						)}
					</CardContent>
				</Card>
			</Box>
		</Box>
	)
}
