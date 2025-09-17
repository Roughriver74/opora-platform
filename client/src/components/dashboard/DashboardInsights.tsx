import React from 'react'
import {
	Grid,
	Card,
	CardContent,
	Typography,
	Box,
	List,
	ListItem,
	ListItemText,
	ListItemIcon,
	Chip,
	Avatar,
	Divider,
} from '@mui/material'
import {
	TrendingUp,
	TrendingDown,
	Insights,
	Speed,
	People,
	Assignment,
} from '@mui/icons-material'
import { DashboardData } from '../../types/dashboard'

interface DashboardInsightsProps {
	data: DashboardData
}

export const DashboardInsights: React.FC<DashboardInsightsProps> = ({
	data,
}) => {
	const { stats, topLists } = data

	const getInsightIcon = (trend: number) => {
		return trend > 0 ? (
			<TrendingUp color='success' />
		) : (
			<TrendingDown color='error' />
		)
	}

	const getInsightColor = (trend: number): 'success' | 'error' | 'default' => {
		if (trend > 0) return 'success'
		if (trend < 0) return 'error'
		return 'default'
	}

	const insights = [
		{
			title: 'Эффективность обработки',
			value: `${stats.conversionRate}%`,
			description: 'Заявок завершено успешно',
			icon: <Speed />,
			color:
				stats.conversionRate > 70
					? '#2e7d32'
					: stats.conversionRate > 50
					? '#ed6c02'
					: '#d32f2f',
		},
		{
			title: 'Средняя нагрузка',
			value: `${Math.round(stats.totalSubmissions / 30)}`,
			description: 'Заявок в день',
			icon: <Assignment />,
			color: '#4c1130',
		},
		{
			title: 'Рост активности',
			value: `${stats.monthlyGrowth > 0 ? '+' : ''}${stats.monthlyGrowth}%`,
			description: 'По сравнению с прошлым месяцем',
			icon: getInsightIcon(stats.monthlyGrowth),
			color:
				getInsightColor(stats.monthlyGrowth) === 'success'
					? '#2e7d32'
					: '#d32f2f',
		},
	]

	const topPerformer = topLists.topManagers[0]
	const mostActiveForm = topLists.topForms[0]
	const mostActiveClient = topLists.topClients[0]

	return (
		<Grid container spacing={3}>
			{/* Ключевые метрики */}
			<Grid size={{ xs: 12 }}>
				<Card>
					<CardContent>
						<Typography
							variant='h6'
							gutterBottom
							sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
						>
							<Insights color='primary' />
							Ключевые инсайты
						</Typography>
						<Grid container spacing={2}>
							{insights.map((insight, index) => (
								<Grid size={{ xs: 12, sm: 4 }} key={index}>
									<Box sx={{ textAlign: 'center', p: 2 }}>
										<Avatar
											sx={{
												backgroundColor: `${insight.color}20`,
												color: insight.color,
												mx: 'auto',
												mb: 1,
											}}
										>
											{insight.icon}
										</Avatar>
										<Typography
											variant='h4'
											sx={{ fontWeight: 'bold', color: insight.color }}
										>
											{insight.value}
										</Typography>
										<Typography variant='body2' color='text.secondary'>
											{insight.title}
										</Typography>
										<Typography variant='caption' color='text.secondary'>
											{insight.description}
										</Typography>
									</Box>
								</Grid>
							))}
						</Grid>
					</CardContent>
				</Card>
			</Grid>

			{/* Топ исполнители */}
			<Grid size={{ xs: 12, md: 4 }}>
				<Card sx={{ height: '100%' }}>
					<CardContent>
						<Typography
							variant='h6'
							gutterBottom
							sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
						>
							<People color='primary' />
							Топ исполнитель
						</Typography>
						{topPerformer ? (
							<Box>
								<Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
									<Avatar sx={{ backgroundColor: '#1976d2', mr: 2 }}>
										{topPerformer.name.charAt(0).toUpperCase()}
									</Avatar>
									<Box>
										<Typography variant='h6'>{topPerformer.name}</Typography>
										<Typography variant='body2' color='text.secondary'>
											{topPerformer.count} заявок
										</Typography>
									</Box>
								</Box>
								<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
									<Chip
										label={`${topPerformer.percentage}% от общего объема`}
										color='primary'
										size='small'
									/>
								</Box>
							</Box>
						) : (
							<Typography color='text.secondary'>Нет данных</Typography>
						)}
					</CardContent>
				</Card>
			</Grid>

			{/* Самая активная форма */}
			<Grid size={{ xs: 12, md: 4 }}>
				<Card sx={{ height: '100%' }}>
					<CardContent>
						<Typography
							variant='h6'
							gutterBottom
							sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
						>
							<Assignment color='primary' />
							Популярная форма
						</Typography>
						{mostActiveForm ? (
							<Box>
								<Typography variant='h6' sx={{ mb: 1 }}>
									{mostActiveForm.name}
								</Typography>
								<Typography
									variant='body2'
									color='text.secondary'
									sx={{ mb: 2 }}
								>
									{mostActiveForm.count} заявок
								</Typography>
								<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
									<Chip
										label={`${mostActiveForm.percentage}% от общего объема`}
										color='secondary'
										size='small'
									/>
								</Box>
							</Box>
						) : (
							<Typography color='text.secondary'>Нет данных</Typography>
						)}
					</CardContent>
				</Card>
			</Grid>

			{/* Самый активный клиент */}
			<Grid size={{ xs: 12, md: 4 }}>
				<Card sx={{ height: '100%' }}>
					<CardContent>
						<Typography
							variant='h6'
							gutterBottom
							sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
						>
							<People color='primary' />
							Активный клиент
						</Typography>
						{mostActiveClient ? (
							<Box>
								<Typography variant='h6' sx={{ mb: 1 }}>
									{mostActiveClient.name}
								</Typography>
								<Typography
									variant='body2'
									color='text.secondary'
									sx={{ mb: 2 }}
								>
									{mostActiveClient.count} заявок
								</Typography>
								<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
									<Chip
										label={`${mostActiveClient.percentage}% от общего объема`}
										color='success'
										size='small'
									/>
								</Box>
							</Box>
						) : (
							<Typography color='text.secondary'>Нет данных</Typography>
						)}
					</CardContent>
				</Card>
			</Grid>
		</Grid>
	)
}
