import React from 'react'
import {
	Grid,
	Card,
	CardContent,
	Typography,
	Box,
	Chip,
} from '@mui/material'
import {
	TrendingUp,
	TrendingDown,
	Assignment,
	CheckCircle,
	Schedule,
	Speed,
	Percent,
	CalendarToday,
} from '@mui/icons-material'
import { DashboardStats as IDashboardStats } from '../../types/dashboard'

interface DashboardStatsProps {
	data: IDashboardStats
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ data }) => {
	const formatNumber = (num: number): string => {
		return new Intl.NumberFormat('ru-RU').format(num)
	}

	const formatTime = (timeInMinutes: string): string => {
		const minutes = parseFloat(timeInMinutes)
		if (isNaN(minutes) || minutes === 0) return 'Нет данных'
		if (minutes < 60) return `${minutes} мин`
		const hours = Math.floor(minutes / 60)
		const remainingMinutes = minutes % 60
		return remainingMinutes > 0 ? `${hours}ч ${remainingMinutes}м` : `${hours}ч`
	}

	const getGrowthIcon = (growth: number) => {
		return growth >= 0 ? (
			<TrendingUp color='success' />
		) : (
			<TrendingDown color='error' />
		)
	}

	const getGrowthColor = (growth: number): 'success' | 'error' | 'default' => {
		if (growth > 0) return 'success'
		if (growth < 0) return 'error'
		return 'default'
	}

	const StatCard: React.FC<{
		title: string
		value: string | number
		icon: React.ReactNode
		growth?: number
		subtitle?: string
		color?: string
	}> = ({ title, value, icon, growth, subtitle, color = '#4c1130' }) => (
		<Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
			<CardContent>
				<Box
					sx={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						mb: 2,
					}}
				>
					<Box
						sx={{
							backgroundColor: `${color}20`,
							borderRadius: '12px',
							p: 1.5,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						{icon}
					</Box>
					{growth !== undefined && (
						<Chip
							icon={getGrowthIcon(growth)}
							label={`${growth > 0 ? '+' : ''}${growth}%`}
							color={getGrowthColor(growth)}
							size='small'
							variant='outlined'
						/>
					)}
				</Box>

				<Typography
					variant='h4'
					component='div'
					sx={{ fontWeight: 'bold', mb: 1 }}
				>
					{value}
				</Typography>

				<Typography variant='body2' color='text.secondary'>
					{title}
				</Typography>

				{subtitle && (
					<Typography
						variant='caption'
						color='text.secondary'
						sx={{ mt: 1, display: 'block' }}
					>
						{subtitle}
					</Typography>
				)}
			</CardContent>
		</Card>
	)

	return (
		<Grid container spacing={3}>
			{/* Общее количество заявок */}
			<Grid size={{ xs: 12, sm: 6, md: 3 }}>
				<StatCard
					title='Всего заявок'
					value={formatNumber(data.totalSubmissions)}
					icon={<Assignment sx={{ color: '#4c1130' }} />}
					growth={data.monthlyGrowth}
					subtitle='За выбранный период'
				/>
			</Grid>

			{/* Новые заявки */}
			<Grid size={{ xs: 12, sm: 6, md: 3 }}>
				<StatCard
					title='Новые заявки'
					value={formatNumber(data.newSubmissions)}
					icon={<CalendarToday sx={{ color: '#1976d2' }} />}
					subtitle='Требуют обработки'
					color='#1976d2'
				/>
			</Grid>

			{/* Завершенные заявки */}
			<Grid size={{ xs: 12, sm: 6, md: 3 }}>
				<StatCard
					title='Завершенные'
					value={formatNumber(data.completedSubmissions)}
					icon={<CheckCircle sx={{ color: '#2e7d32' }} />}
					subtitle='Успешно обработаны'
					color='#2e7d32'
				/>
			</Grid>

			{/* В работе */}
			<Grid size={{ xs: 12, sm: 6, md: 3 }}>
				<StatCard
					title='В работе'
					value={formatNumber(data.inProgressSubmissions)}
					icon={<Schedule sx={{ color: '#ed6c02' }} />}
					subtitle='Обрабатываются'
					color='#ed6c02'
				/>
			</Grid>

			{/* Среднее время обработки */}
			<Grid size={{ xs: 12, sm: 6, md: 3 }}>
				<StatCard
					title='Среднее время обработки'
					value={formatTime(data.averageProcessingTime)}
					icon={<Speed sx={{ color: '#9c27b0' }} />}
					subtitle='От создания до завершения'
					color='#9c27b0'
				/>
			</Grid>

			{/* Конверсия */}
			<Grid size={{ xs: 12, sm: 6, md: 3 }}>
				<StatCard
					title='Конверсия'
					value={`${data.conversionRate}%`}
					icon={<Percent sx={{ color: '#d32f2f' }} />}
					subtitle='Заявки → Завершенные'
					color='#d32f2f'
				/>
			</Grid>

			{/* Рост за месяц */}
			<Grid size={{ xs: 12, sm: 6, md: 3 }}>
				<StatCard
					title='Рост за месяц'
					value={`${data.monthlyGrowth > 0 ? '+' : ''}${data.monthlyGrowth}%`}
					icon={getGrowthIcon(data.monthlyGrowth)}
					subtitle='По сравнению с предыдущим месяцем'
					color={data.monthlyGrowth >= 0 ? '#2e7d32' : '#d32f2f'}
				/>
			</Grid>

			{/* Рост за неделю */}
			<Grid size={{ xs: 12, sm: 6, md: 3 }}>
				<StatCard
					title='Рост за неделю'
					value={`${data.weeklyGrowth > 0 ? '+' : ''}${data.weeklyGrowth}%`}
					icon={getGrowthIcon(data.weeklyGrowth)}
					subtitle='По сравнению с предыдущей неделей'
					color={data.weeklyGrowth >= 0 ? '#2e7d32' : '#d32f2f'}
				/>
			</Grid>
		</Grid>
	)
}
