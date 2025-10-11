import React from 'react'
import {
	Box,
	FormControlLabel,
	Switch,
	Typography,
	Paper,
	Collapse,
	Alert,
	useTheme,
	useMediaQuery,
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
	const theme = useTheme()
	const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

	return (
		<Paper
			elevation={isMobile ? 0 : 2}
			sx={{
				p: isMobile ? 1 : 2,
				mb: isMobile ? 1.5 : 3,
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
				<Box display='flex' alignItems='center' gap={isMobile ? 1 : 1.5}>
					<CalendarMonth
						sx={{
							fontSize: isMobile ? 20 : 28,
							color: enabled ? 'primary.main' : 'text.secondary',
						}}
					/>
					<Box>
						<Typography
							variant={isMobile ? 'body2' : 'subtitle1'}
							fontWeight={600}
							color={enabled ? 'primary.main' : 'text.primary'}
							sx={{ fontSize: isMobile ? '0.875rem' : undefined }}
						>
							{isMobile ? 'Период' : 'Заявка на период'}
						</Typography>
						{!isMobile && (
							<Typography variant='caption' color='text.secondary'>
								Создать несколько заявок на диапазон дат
							</Typography>
						)}
					</Box>
				</Box>

				<FormControlLabel
					control={
						<Switch
							checked={enabled}
							onChange={e => onToggle(e.target.checked)}
							disabled={!hasDateField}
							color='primary'
							size={isMobile ? 'small' : 'medium'}
						/>
					}
					label=''
					sx={{ m: 0 }}
				/>
			</Box>

			<Collapse in={!hasDateField}>
				<Alert
					severity='warning'
					sx={{
						mt: isMobile ? 1 : 2,
						fontSize: isMobile ? '0.75rem' : undefined,
					}}
				>
					{isMobile
						? 'Нужно поле "Дата"'
						: 'Для использования периодических заявок необходимо добавить поле с типом "Дата" в форму'}
				</Alert>
			</Collapse>

			<Collapse in={enabled && hasDateField}>
				<Alert severity='info' sx={{ mt: isMobile ? 1 : 2 }}>
					<Typography variant={isMobile ? 'caption' : 'body2'} fontWeight={500}>
						{isMobile ? 'Период активен' : 'Режим периодических заявок активен'}
					</Typography>
					{!isMobile && (
						<Typography variant='caption'>
							{dateFieldName
								? `Поле даты: "${dateFieldName}". Будет создана отдельная заявка для каждой даты в выбранном диапазоне.`
								: 'Выберите диапазон дат ниже. Для каждой даты будет создана отдельная заявка.'}
						</Typography>
					)}
				</Alert>
			</Collapse>
		</Paper>
	)
}
