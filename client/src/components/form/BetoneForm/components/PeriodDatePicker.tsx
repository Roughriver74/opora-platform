import React, { useState, useEffect } from 'react'
import {
	Box,
	Paper,
	Typography,
	TextField,
	Chip,
	Alert,
	useTheme,
	useMediaQuery,
} from '@mui/material'
import { DateRange, Event } from '@mui/icons-material'
import { formatDate } from '../utils/dateHelpers'

interface PeriodDatePickerProps {
	startDate: string
	endDate: string
	onStartDateChange: (date: string) => void
	onEndDateChange: (date: string) => void
	error?: string
}

export const PeriodDatePicker: React.FC<PeriodDatePickerProps> = ({
	startDate,
	endDate,
	onStartDateChange,
	onEndDateChange,
	error,
}) => {
	const theme = useTheme()
	const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
	const [daysCount, setDaysCount] = useState<number>(0)

	useEffect(() => {
		if (startDate && endDate) {
			const start = new Date(startDate)
			const end = new Date(endDate)
			const diffTime = Math.abs(end.getTime() - start.getTime())
			const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
			setDaysCount(diffDays)
		} else {
			setDaysCount(0)
		}
	}, [startDate, endDate])

	const today = new Date().toISOString().split('T')[0]

	return (
		<Paper
			elevation={isMobile ? 0 : 1}
			sx={{
				p: isMobile ? 1.5 : 2.5,
				mb: isMobile ? 1.5 : 3,
				border: theme => `1px solid ${theme.palette.divider}`,
			}}
		>
			<Box
				display='flex'
				alignItems='center'
				gap={isMobile ? 0.5 : 1}
				mb={isMobile ? 1.5 : 2}
			>
				<DateRange color='primary' sx={{ fontSize: isMobile ? 18 : 24 }} />
				<Typography
					variant={isMobile ? 'body2' : 'subtitle1'}
					fontWeight={600}
					sx={{ fontSize: isMobile ? '0.875rem' : undefined }}
				>
					{isMobile ? 'Даты' : 'Диапазон дат'}
				</Typography>
			</Box>

			<Box
				sx={{
					display: 'flex',
					gap: isMobile ? 1 : 2,
					flexDirection: 'column',
				}}
			>
				<Box sx={{ flex: 1 }}>
					<TextField
						fullWidth
						type='date'
						label={isMobile ? 'От' : 'Начальная дата'}
						value={startDate}
						onChange={e => onStartDateChange(e.target.value)}
						InputLabelProps={{ shrink: true }}
						inputProps={{
							min: today,
						}}
						error={!!error}
						size={isMobile ? 'small' : 'small'}
						sx={{
							'& .MuiInputBase-input': {
								fontSize: isMobile ? '16px' : undefined, // Предотвращает зум на iOS
							},
						}}
					/>
				</Box>

				<Box sx={{ flex: 1 }}>
					<TextField
						fullWidth
						type='date'
						label={isMobile ? 'До' : 'Конечная дата'}
						value={endDate}
						onChange={e => onEndDateChange(e.target.value)}
						InputLabelProps={{ shrink: true }}
						inputProps={{
							min: startDate || today,
						}}
						error={!!error}
						size={isMobile ? 'small' : 'small'}
						sx={{
							'& .MuiInputBase-input': {
								fontSize: isMobile ? '16px' : undefined, // Предотвращает зум на iOS
							},
						}}
					/>
				</Box>
			</Box>

			{error && (
				<Alert
					severity='error'
					sx={{
						mt: isMobile ? 1 : 2,
						fontSize: isMobile ? '0.75rem' : undefined,
					}}
				>
					{error}
				</Alert>
			)}

			{daysCount > 0 && !error && (
				<Box
					mt={isMobile ? 1.5 : 2}
					display='flex'
					alignItems='center'
					gap={isMobile ? 0.5 : 1}
					flexWrap='wrap'
				>
					<Event fontSize='small' color='action' />
					<Typography
						variant={isMobile ? 'caption' : 'body2'}
						color='text.secondary'
					>
						{isMobile ? 'Заявок:' : 'Будет создано заявок:'}
					</Typography>
					<Chip
						label={daysCount}
						color='primary'
						size='small'
						sx={{
							fontWeight: 600,
							fontSize: isMobile ? '0.75rem' : undefined,
							height: isMobile ? 20 : undefined,
						}}
					/>
					{!isMobile && (
						<Typography variant='caption' color='text.secondary'>
							({startDate ? formatDate(startDate) : ''} -{' '}
							{endDate ? formatDate(endDate) : ''})
						</Typography>
					)}
				</Box>
			)}

			{daysCount > 30 && (
				<Alert severity='warning' sx={{ mt: isMobile ? 1 : 2 }}>
					<Typography variant={isMobile ? 'caption' : 'body2'}>
						{isMobile
							? `Много заявок (${daysCount} шт.)`
							: `Вы создаете большое количество заявок (${daysCount} шт.). Убедитесь, что это необходимо.`}
					</Typography>
				</Alert>
			)}
		</Paper>
	)
}
