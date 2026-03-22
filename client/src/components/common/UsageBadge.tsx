import React from 'react'
import { Box, LinearProgress, Typography } from '@mui/material'

interface UsageBadgeProps {
	current: number
	limit: number
	label: string
}

const UsageBadge: React.FC<UsageBadgeProps> = ({ current, limit, label }) => {
	// Unlimited plan — don't show
	if (limit === -1) return null

	const percent = limit > 0 ? Math.min((current / limit) * 100, 100) : 0
	const isWarning = percent >= 80 && percent < 100
	const isError = percent >= 100

	let color: 'primary' | 'warning' | 'error' = 'primary'
	if (isWarning) color = 'warning'
	if (isError) color = 'error'

	return (
		<Box sx={{ minWidth: 120, maxWidth: 180 }}>
			<Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
				<Typography variant='caption' color='text.secondary' noWrap>
					{label}
				</Typography>
				<Typography
					variant='caption'
					color={isError ? 'error.main' : isWarning ? 'warning.main' : 'text.secondary'}
					sx={{ ml: 0.5, whiteSpace: 'nowrap' }}
				>
					{isError ? 'Лимит исчерпан' : `${current} / ${limit}`}
				</Typography>
			</Box>
			<LinearProgress
				variant='determinate'
				value={percent}
				color={color}
				sx={{ height: 4, borderRadius: 2 }}
			/>
		</Box>
	)
}

export default UsageBadge
