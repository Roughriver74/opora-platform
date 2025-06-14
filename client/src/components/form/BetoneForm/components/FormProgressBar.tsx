import React from 'react';
import { Box, LinearProgress, Typography, Chip } from '@mui/material';
import { FormProgress } from '../types';

interface FormProgressBarProps {
	progress: FormProgress;
	progressColor: string;
	progressText: string;
	progressStatus: 'low' | 'medium' | 'high' | 'complete';
	compact?: boolean;
}

export const FormProgressBar: React.FC<FormProgressBarProps> = ({
	progress,
	progressColor,
	progressText,
	progressStatus,
	compact = false,
}) => {
	const getStatusText = () => {
		switch (progressStatus) {
			case 'complete':
				return 'Завершено';
			case 'high':
				return 'Почти готово';
			case 'medium':
				return 'В процессе';
			case 'low':
				return 'Начало';
			default:
				return 'В процессе';
		}
	};

	const getStatusColor = () => {
		switch (progressStatus) {
			case 'complete':
				return 'success';
			case 'high':
				return 'primary';
			case 'medium':
				return 'warning';
			case 'low':
				return 'error';
			default:
				return 'default';
		}
	};

	if (compact) {
		return (
			<Box sx={{ mb: 2 }}>
				<LinearProgress
					variant="determinate"
					value={progress.percentage}
					sx={{
						height: 6,
						borderRadius: 3,
						backgroundColor: '#f0f0f0',
						'& .MuiLinearProgress-bar': {
							backgroundColor: progressColor,
							borderRadius: 3,
						},
					}}
				/>
			</Box>
		);
	}

	return (
		<Box sx={{ mb: 3 }}>
			<Box
				sx={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					mb: 1,
				}}
			>
				<Typography variant="body2" color="text.secondary">
					{progressText}
				</Typography>
				<Chip
					label={getStatusText()}
					color={getStatusColor() as any}
					size="small"
					variant="outlined"
				/>
			</Box>
			<LinearProgress
				variant="determinate"
				value={progress.percentage}
				sx={{
					height: 8,
					borderRadius: 4,
					backgroundColor: '#f0f0f0',
					'& .MuiLinearProgress-bar': {
						backgroundColor: progressColor,
						borderRadius: 4,
					},
				}}
			/>
			<Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
				<Typography variant="caption" color="text.secondary">
					{progress.percentage}%
				</Typography>
			</Box>
		</Box>
	);
};
