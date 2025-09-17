import React, { useState, useEffect } from 'react'
import {
	Container,
	Typography,
	Box,
	Grid,
	Card,
	CardContent,
	CircularProgress,
	Alert,
	Button,
	Paper,
} from '@mui/material'
import { useAuth } from '../contexts/auth'
import { DashboardStats } from '../components/dashboard/DashboardStats'
import { DashboardFilters } from '../components/dashboard/DashboardFilters'
import { DashboardCharts } from '../components/dashboard/DashboardCharts'
import { DashboardTopLists } from '../components/dashboard/DashboardTopLists'
import { DashboardInsights } from '../components/dashboard/DashboardInsights'
import { dashboardService } from '../services/dashboardService'
import {
	DashboardData,
	DashboardFilters as IDashboardFilters,
} from '../types/dashboard'

const DashboardPage: React.FC = () => {
	const { user } = useAuth()
	const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [filters, setFilters] = useState<IDashboardFilters>({
		dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
			.toISOString()
			.split('T')[0],
		dateTo: new Date().toISOString().split('T')[0],
		period: 'month',
	})

	// Загрузка данных дашборда
	const loadDashboardData = async (currentFilters: IDashboardFilters) => {
		try {
			setLoading(true)
			setError(null)
			const data = await dashboardService.getDashboardData(currentFilters)
			setDashboardData(data)
		} catch (err: any) {
			setError(err.message || 'Ошибка загрузки данных дашборда')
		} finally {
			setLoading(false)
		}
	}

	// Обработчик изменения фильтров
	const handleFiltersChange = (newFilters: IDashboardFilters) => {
		setFilters(newFilters)
		loadDashboardData(newFilters)
	}

	// Загрузка данных при монтировании
	useEffect(() => {
		loadDashboardData(filters)
	}, [])

	return (
		<Container maxWidth='xl' sx={{ mt: 4, mb: 4 }}>
			{/* Заголовок */}
			<Box
				sx={{
					mb: 4,
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
				}}
			>
				<div>
					<Typography variant='h4' component='h1' gutterBottom>
						Дашборд аналитики
					</Typography>
					<Typography variant='subtitle1' color='text.secondary'>
						Статистика по заявкам и эффективности работы
					</Typography>
				</div>
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
					<Typography variant='body2' color='text.secondary'>
						Добро пожаловать,{' '}
						{user?.firstName || user?.fullName || 'Администратор'}
					</Typography>
				</Box>
			</Box>

			{/* Фильтры */}
			<Paper sx={{ p: 3, mb: 4 }}>
				<DashboardFilters
					filters={filters}
					onFiltersChange={handleFiltersChange}
					loading={loading}
				/>
			</Paper>

			{/* Ошибка */}
			{error && (
				<Alert severity='error' sx={{ mb: 4 }}>
					{error}
					<Button
						variant='outlined'
						size='small'
						onClick={() => loadDashboardData(filters)}
						sx={{ ml: 2 }}
					>
						Повторить
					</Button>
				</Alert>
			)}

			{/* Загрузка */}
			{loading && (
				<Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
					<CircularProgress />
				</Box>
			)}

			{/* Контент дашборда */}
			{dashboardData && !loading && (
				<>
					{/* Основная статистика */}
					<Box sx={{ mb: 4 }}>
						<DashboardStats data={dashboardData.stats} />
					</Box>

					{/* Инсайты */}
					<Box sx={{ mb: 4 }}>
						<DashboardInsights data={dashboardData} />
					</Box>

					{/* Графики */}
					<Box sx={{ mb: 4 }}>
						<DashboardCharts data={dashboardData.charts} />
					</Box>

					{/* Топы */}
					<Box sx={{ mb: 4 }}>
						<DashboardTopLists data={dashboardData.topLists} />
					</Box>
				</>
			)}
		</Container>
	)
}

export default DashboardPage
