import React from 'react'
import {
	Box,
	FormControlLabel,
	Switch,
	Typography,
	useTheme,
	useMediaQuery,
} from '@mui/material'
import { Schedule } from '@mui/icons-material'

interface PeriodTimeToggleProps {
	enabled: boolean
	onToggle: (enabled: boolean) => void
	hasTimeField: boolean
}

export const PeriodTimeToggle: React.FC<PeriodTimeToggleProps> = ({
	enabled,
	onToggle,
	hasTimeField,
}) => {
	const theme = useTheme()
	const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

	if (!hasTimeField) {
		return null
	}

	return (
		<Box
			sx={{
				display: 'flex',
				alignItems: 'center',
				gap: isMobile ? 1 : 1.5,
				p: isMobile ? 1 : 1.5,
				bgcolor: enabled ? 'primary.50' : 'grey.50',
				borderRadius: 1,
				border: theme => `1px solid ${theme.palette.divider}`,
				transition: 'all 0.3s ease',
			}}
		>
			<Schedule
				color={enabled ? 'primary' : 'action'}
				sx={{ fontSize: isMobile ? 20 : 24 }}
			/>
			<Box sx={{ flex: 1 }}>
				<Typography
					variant={isMobile ? 'body2' : 'body1'}
					fontWeight={enabled ? 600 : 400}
					sx={{ fontSize: isMobile ? '0.875rem' : undefined }}
				>
					Распределить время
				</Typography>
				{!isMobile && (
					<Typography variant='caption' color='text.secondary'>
						Время будет равномерно распределено по всем заявкам
					</Typography>
				)}
			</Box>
			<FormControlLabel
				control={
					<Switch
						checked={enabled}
						onChange={e => onToggle(e.target.checked)}
						color='primary'
					/>
				}
				label=''
				sx={{ m: 0 }}
			/>
		</Box>
	)
}
