import React from 'react';
import { Box, Button, CircularProgress } from '@mui/material';
import { FORM_CONSTANTS } from '../constants';

interface SubmitButtonProps {
	submitting: boolean;
	disabled?: boolean;
	fullWidth?: boolean;
	variant?: 'primary' | 'success';
	size?: 'small' | 'medium' | 'large';
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({
	submitting,
	disabled = false,
	fullWidth = false,
	variant = 'success',
	size = 'large',
}) => {
	const isDisabled = submitting || disabled;

	return (
		<Box sx={{ mt: 3, textAlign: 'center' }}>
			<Button
				type="submit"
				variant="contained"
				color={variant === 'success' ? 'success' : 'primary'}
				size={size}
				disabled={isDisabled}
				fullWidth={fullWidth}
				sx={{
					minWidth: { xs: '100%', sm: fullWidth ? '100%' : '300px' },
					maxWidth: fullWidth ? '100%' : { xs: '100%', sm: '300px' },
					py: { xs: 2, sm: size === 'large' ? 1.5 : 1 },
					fontSize: { xs: '1rem', sm: size === 'large' ? '1rem' : '0.875rem' },
					fontWeight: 'bold',
				}}
			>
				{submitting ? (
					<CircularProgress size={24} color="inherit" />
				) : (
					FORM_CONSTANTS.SUBMIT_LABELS.default
				)}
			</Button>
		</Box>
	);
};
