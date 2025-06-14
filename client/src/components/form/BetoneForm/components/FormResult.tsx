import React from 'react';
import { Alert, Box, Button } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import { SubmitResult } from '../types';

interface FormResultProps {
	result: SubmitResult | null;
	onClose?: () => void;
	onReset?: () => void;
}

export const FormResult: React.FC<FormResultProps> = ({
	result,
	onClose,
	onReset,
}) => {
	if (!result) {
		return null;
	}

	return (
		<Box sx={{ mb: 3 }}>
			<Alert
				severity={result.success ? 'success' : 'error'}
				icon={result.success ? <CheckCircle /> : undefined}
				action={
					<Box sx={{ display: 'flex', gap: 1 }}>
						{onClose && (
							<Button 
								color="inherit" 
								size="small" 
								onClick={onClose}
							>
								Закрыть
							</Button>
						)}
						{result.success && onReset && (
							<Button 
								color="inherit" 
								size="small" 
								onClick={onReset}
							>
								Новая заявка
							</Button>
						)}
					</Box>
				}
				sx={{
					'& .MuiAlert-message': {
						flex: 1,
					},
				}}
			>
				{result.message}
			</Alert>
		</Box>
	);
};
