import React from 'react'
import {
	Box,
	Grid,
	TextField,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Button,
	Typography,
	Chip,
} from '@mui/material'
// import { DatePicker } from '@mui/x-date-pickers/DatePicker'
// import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
// import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
// import { ru } from 'date-fns/locale'
import { DashboardFilters as IDashboardFilters } from '../../types/dashboard'

interface DashboardFiltersProps {
	filters: IDashboardFilters
	onFiltersChange: (filters: IDashboardFilters) => void
	loading: boolean
}

export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
	filters,
	onFiltersChange,
	loading,
}) => {
	const handleDateChange = (field: 'dateFrom' | 'dateTo', value: string) => {
		onFiltersChange({
			...filters,
			[field]: value,
		})
	}

	const handlePeriodChange = (period: IDashboardFilters['period']) => {
		const today = new Date()
		let dateFrom: string
		let dateTo: string = today.toISOString().split('T')[0]

		switch (period) {
			case 'day':
				dateFrom = dateTo
				break
			case 'week':
				const weekStart = new Date(today)
				weekStart.setDate(today.getDate() - today.getDay())
				dateFrom = weekStart.toISOString().split('T')[0]
				break
			case 'month':
				dateFrom = new Date(today.getFullYear(), today.getMonth(), 1)
					.toISOString()
					.split('T')[0]
				break
			case 'quarter':
				const quarterStart = new Date(
					today.getFullYear(),
					Math.floor(today.getMonth() / 3) * 3,
					1
				)
				dateFrom = quarterStart.toISOString().split('T')[0]
				break
			case 'year':
				dateFrom = new Date(today.getFullYear(), 0, 1)
					.toISOString()
					.split('T')[0]
				break
			default:
				dateFrom = filters.dateFrom
		}

		onFiltersChange({
			...filters,
			period,
			dateFrom,
			dateTo,
		})
	}

	const handleFilterChange = (
		field: keyof IDashboardFilters,
		value: string
	) => {
		onFiltersChange({
			...filters,
			[field]: value || undefined,
		})
	}

	const clearFilters = () => {
		const today = new Date()
		onFiltersChange({
			dateFrom: new Date(today.getFullYear(), today.getMonth(), 1)
				.toISOString()
				.split('T')[0],
			dateTo: today.toISOString().split('T')[0],
			period: 'month',
		})
	}

	const getActiveFiltersCount = () => {
		let count = 0
		if (filters.assignedTo) count++
		if (filters.userId) count++
		if (filters.formId) count++
		if (filters.status) count++
		if (filters.priority) count++
		return count
	}

	return (
		<Box>
			<Box
				sx={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					mb: 3,
				}}
			>
				<Typography variant='h6'>Фильтры</Typography>
				<Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
					{getActiveFiltersCount() > 0 && (
						<Chip
							label={`Активных фильтров: ${getActiveFiltersCount()}`}
							color='primary'
							size='small'
						/>
					)}
					<Button
						variant='outlined'
						size='small'
						onClick={clearFilters}
						disabled={loading}
					>
						Очистить
					</Button>
				</Box>
			</Box>

			<Grid container spacing={3}>
				{/* Период */}
				<Grid size={{ xs: 12, sm: 6, md: 2 }}>
					<FormControl fullWidth size='small'>
						<InputLabel>Период</InputLabel>
						<Select
							value={filters.period}
							label='Период'
							onChange={e =>
								handlePeriodChange(
									e.target.value as IDashboardFilters['period']
								)
							}
							disabled={loading}
						>
							<MenuItem value='day'>День</MenuItem>
							<MenuItem value='week'>Неделя</MenuItem>
							<MenuItem value='month'>Месяц</MenuItem>
							<MenuItem value='quarter'>Квартал</MenuItem>
							<MenuItem value='year'>Год</MenuItem>
						</Select>
					</FormControl>
				</Grid>

				{/* Дата от */}
				<Grid size={{ xs: 12, sm: 6, md: 2 }}>
					<TextField
						fullWidth
						size='small'
						label='Дата от'
						type='date'
						value={filters.dateFrom}
						onChange={e => handleDateChange('dateFrom', e.target.value)}
						disabled={loading}
						InputLabelProps={{
							shrink: true,
						}}
					/>
				</Grid>

				{/* Дата до */}
				<Grid size={{ xs: 12, sm: 6, md: 2 }}>
					<TextField
						fullWidth
						size='small'
						label='Дата до'
						type='date'
						value={filters.dateTo}
						onChange={e => handleDateChange('dateTo', e.target.value)}
						disabled={loading}
						InputLabelProps={{
							shrink: true,
						}}
					/>
				</Grid>

				{/* Статус */}
				<Grid size={{ xs: 12, sm: 6, md: 2 }}>
					<FormControl fullWidth size='small'>
						<InputLabel>Статус</InputLabel>
						<Select
							value={filters.status || ''}
							label='Статус'
							onChange={e => handleFilterChange('status', e.target.value)}
							disabled={loading}
						>
							<MenuItem value=''>Все статусы</MenuItem>
							<MenuItem value='NEW'>Новые</MenuItem>
							<MenuItem value='IN_PROGRESS'>В работе</MenuItem>
							<MenuItem value='COMPLETED'>Завершенные</MenuItem>
							<MenuItem value='CANCELLED'>Отмененные</MenuItem>
						</Select>
					</FormControl>
				</Grid>

				{/* Приоритет */}
				<Grid size={{ xs: 12, sm: 6, md: 2 }}>
					<FormControl fullWidth size='small'>
						<InputLabel>Приоритет</InputLabel>
						<Select
							value={filters.priority || ''}
							label='Приоритет'
							onChange={e => handleFilterChange('priority', e.target.value)}
							disabled={loading}
						>
							<MenuItem value=''>Все приоритеты</MenuItem>
							<MenuItem value='low'>Низкий</MenuItem>
							<MenuItem value='medium'>Средний</MenuItem>
							<MenuItem value='high'>Высокий</MenuItem>
							<MenuItem value='urgent'>Срочный</MenuItem>
						</Select>
					</FormControl>
				</Grid>

				{/* Менеджер */}
				<Grid size={{ xs: 12, sm: 6, md: 2 }}>
					<TextField
						fullWidth
						size='small'
						label='Менеджер'
						value={filters.assignedTo || ''}
						onChange={e => handleFilterChange('assignedTo', e.target.value)}
						disabled={loading}
						placeholder='ID менеджера'
					/>
				</Grid>
			</Grid>
		</Box>
	)
}
