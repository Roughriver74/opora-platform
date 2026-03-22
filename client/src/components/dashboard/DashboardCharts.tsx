import React from 'react'
import {
	Grid,
	Card,
	CardContent,
	Typography,
	Box,
} from '@mui/material'
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	PieChart,
	Pie,
	Cell,
	LineChart,
	Line,
} from 'recharts'
import { DashboardCharts as IDashboardCharts } from '../../types/dashboard'

interface DashboardChartsProps {
	data: IDashboardCharts
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ data }) => {
	const COLORS = [
		'#1B4965',
		'#f50057',
		'#1976d2',
		'#2e7d32',
		'#ed6c02',
		'#9c27b0',
		'#d32f2f',
	]

	const ChartCard: React.FC<{
		title: string
		children: React.ReactNode
		height?: number
	}> = ({ title, children, height = 300 }) => (
		<Card sx={{ height: '100%' }}>
			<CardContent>
				<Typography variant='h6' gutterBottom>
					{title}
				</Typography>
				<Box sx={{ height, width: '100%' }}>{children}</Box>
			</CardContent>
		</Card>
	)

	const CustomTooltip = ({ active, payload, label }: any) => {
		if (active && payload && payload.length) {
			return (
				<Box
					sx={{
						backgroundColor: 'white',
						border: '1px solid #ccc',
						borderRadius: 1,
						p: 1,
						boxShadow: 2,
					}}
				>
					<Typography variant='body2' sx={{ fontWeight: 'bold' }}>
						{label}
					</Typography>
					{payload.map((entry: any, index: number) => (
						<Typography key={index} variant='body2' sx={{ color: entry.color }}>
							{entry.name}: {entry.value}
						</Typography>
					))}
				</Box>
			)
		}
		return null
	}

	const hasData = (chartData: any) => {
		return (
			chartData &&
			chartData.datasets &&
			chartData.datasets[0] &&
			chartData.datasets[0].data.some((value: number) => value > 0)
		)
	}

	return (
		<Grid container spacing={3}>
			{/* Заявки по месяцам */}
			<Grid size={{ xs: 12, md: 6 }}>
				<ChartCard title='Заявки по месяцам'>
					{hasData(data.submissionsByMonth) ? (
						<ResponsiveContainer width='100%' height='100%'>
							<BarChart
								data={data.submissionsByMonth.labels.map((label, index) => ({
									name: label,
									value: data.submissionsByMonth.datasets[0].data[index],
								}))}
							>
								<CartesianGrid strokeDasharray='3 3' />
								<XAxis dataKey='name' />
								<YAxis />
								<Tooltip content={<CustomTooltip />} />
								<Bar dataKey='value' fill='#1B4965' />
							</BarChart>
						</ResponsiveContainer>
					) : (
						<Box
							sx={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								height: '100%',
							}}
						>
							<Typography color='text.secondary'>Нет данных</Typography>
						</Box>
					)}
				</ChartCard>
			</Grid>

			{/* Заявки по статусам */}
			<Grid size={{ xs: 12, md: 6 }}>
				<ChartCard title='Заявки по статусам'>
					{hasData(data.submissionsByStatus) ? (
						<ResponsiveContainer width='100%' height='100%'>
							<PieChart>
								<Pie
									data={data.submissionsByStatus.labels.map((label, index) => ({
										name: label,
										value: data.submissionsByStatus.datasets[0].data[index],
									}))}
									cx='50%'
									cy='50%'
									labelLine={false}
									label={({ name, percent }: any) =>
										`${name} ${(percent * 100).toFixed(0)}%`
									}
									outerRadius={80}
									fill='#8884d8'
									dataKey='value'
								>
									{data.submissionsByStatus.labels.map((_, index) => (
										<Cell
											key={`cell-${index}`}
											fill={COLORS[index % COLORS.length]}
										/>
									))}
								</Pie>
								<Tooltip content={<CustomTooltip />} />
							</PieChart>
						</ResponsiveContainer>
					) : (
						<Box
							sx={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								height: '100%',
							}}
						>
							<Typography color='text.secondary'>Нет данных</Typography>
						</Box>
					)}
				</ChartCard>
			</Grid>

			{/* Заявки по товарам */}
			<Grid size={{ xs: 12, md: 6 }}>
				<ChartCard title='Заявки по товарам'>
					{hasData(data.submissionsByProducts) ? (
						<ResponsiveContainer width='100%' height='100%'>
							<BarChart
								data={data.submissionsByProducts.labels.map((label, index) => ({
									name:
										label.length > 20 ? label.substring(0, 20) + '...' : label,
									fullName: label,
									value: data.submissionsByProducts.datasets[0].data[index],
								}))}
							>
								<CartesianGrid strokeDasharray='3 3' />
								<XAxis
									dataKey='name'
									angle={-45}
									textAnchor='end'
									height={100}
									fontSize={12}
								/>
								<YAxis />
								<Tooltip
									content={<CustomTooltip />}
									formatter={(value: any, name: any, props: any) => [
										value,
										props.payload.fullName,
									]}
								/>
								<Bar dataKey='value' fill='#2e7d32' />
							</BarChart>
						</ResponsiveContainer>
					) : (
						<Box
							sx={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								height: '100%',
							}}
						>
							<Typography color='text.secondary'>
								Нет данных о товарах
							</Typography>
						</Box>
					)}
				</ChartCard>
			</Grid>

			{/* Заявки по дням недели */}
			<Grid size={{ xs: 12, md: 6 }}>
				<ChartCard title='Заявки по дням недели'>
					{hasData(data.submissionsByDayOfWeek) ? (
						<ResponsiveContainer width='100%' height='100%'>
							<LineChart
								data={data.submissionsByDayOfWeek.labels.map(
									(label, index) => ({
										name: label,
										value: data.submissionsByDayOfWeek.datasets[0].data[index],
									})
								)}
							>
								<CartesianGrid strokeDasharray='3 3' />
								<XAxis dataKey='name' />
								<YAxis />
								<Tooltip content={<CustomTooltip />} />
								<Line
									type='monotone'
									dataKey='value'
									stroke='#f50057'
									strokeWidth={2}
								/>
							</LineChart>
						</ResponsiveContainer>
					) : (
						<Box
							sx={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								height: '100%',
							}}
						>
							<Typography color='text.secondary'>Нет данных</Typography>
						</Box>
					)}
				</ChartCard>
			</Grid>
		</Grid>
	)
}
