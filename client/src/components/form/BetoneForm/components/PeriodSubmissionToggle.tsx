import React from 'react'
import {
	Box,
	FormControlLabel,
	Switch,
	Typography,
	Paper,
	Collapse,
	Alert,
} from '@mui/material'
import { CalendarMonth } from '@mui/icons-material'

interface PeriodSubmissionToggleProps {
	enabled: boolean
	onToggle: (enabled: boolean) => void
	dateFieldName?: string
	hasDateField: boolean
}

export const PeriodSubmissionToggle: React.FC<PeriodSubmissionToggleProps> = ({
	enabled,
	onToggle,
	dateFieldName,
	hasDateField,
}) => {
	return (
		<Paper
			elevation={2}
			sx={{
				p: 2,
				mb: 3,
				background: theme =>
					enabled
						? `linear-gradient(135deg, ${theme.palette.primary.light}15 0%, ${theme.palette.primary.main}15 100%)`
						: theme.palette.background.paper,
				border: theme =>
					enabled
						? `2px solid ${theme.palette.primary.main}`
						: `1px solid ${theme.palette.divider}`,
				transition: 'all 0.3s ease',
			}}
		>
			<Box display='flex' alignItems='center' justifyContent='space-between'>
				<Box display='flex' alignItems='center' gap={1.5}>
					<CalendarMonth
						sx={{
							fontSize: 28,
							color: enabled ? 'primary.main' : 'text.secondary',
						}}
					/>
					<Box>
						<Typography
							variant='subtitle1'
							fontWeight={600}
							color={enabled ? 'primary.main' : 'text.primary'}
						>
							Заявка на период
						</Typography>
						<Typography variant='caption' color='text.secondary'>
							Создать несколько заявок на диапазон дат
						</Typography>
					</Box>
				</Box>

				<FormControlLabel
					control={
						<Switch
							checked={enabled}
							onChange={e => onToggle(e.target.checked)}
							disabled={!hasDateField}
							color='primary'
						/>
					}
					label=''
					sx={{ m: 0 }}
				/>
			</Box>

			<Collapse in={!hasDateField}>
				<Alert severity='warning' sx={{ mt: 2 }}>
					Для использования периодических заявок необходимо добавить поле с
					типом "Дата" в форму
				</Alert>
			</Collapse>

			<Collapse in={enabled && hasDateField}>
				<Alert severity='info' sx={{ mt: 2 }}>
					<Typography variant='body2' fontWeight={500}>
						Режим периодических заявок активен
					</Typography>
					<Typography variant='caption'>
						{dateFieldName
							? `Поле даты: "${dateFieldName}". Будет создана отдельная заявка для каждой даты в выбранном диапазоне.`
							: 'Выберите диапазон дат ниже. Для каждой даты будет создана отдельная заявка.'}
					</Typography>
				</Alert>
			</Collapse>
		</Paper>
	)
}
