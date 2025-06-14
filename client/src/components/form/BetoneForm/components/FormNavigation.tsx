import React from 'react';
import { Box, Button } from '@mui/material';
import { FORM_CONSTANTS } from '../constants';

interface FormNavigationProps {
	canGoPrevious: boolean;
	canGoNext: boolean;
	onPrevious: () => void;
	onNext: () => void;
	isLastSection: boolean;
}

export const FormNavigation: React.FC<FormNavigationProps> = ({
	canGoPrevious,
	canGoNext,
	onPrevious,
	onNext,
	isLastSection,
}) => {
	return (
		<Box
			sx={{
				display: 'flex',
				flexDirection: { xs: 'column', sm: 'row' },
				justifyContent: 'space-between',
				gap: { xs: 2, sm: 0 },
				mt: 4,
				pt: 2,
				borderTop: '1px solidrgb(0, 0, 0)',
			}}
		>
			<Button
				variant="outlined"
				onClick={onPrevious}
				disabled={!canGoPrevious}
				fullWidth
				size="large"
				sx={{ 
					maxWidth: { sm: '48%' },
					order: { xs: 2, sm: 1 }
				}}
			>
				{FORM_CONSTANTS.NAVIGATION_LABELS.previous}
			</Button>

			{canGoNext && (
				<Button
					variant="contained"
					onClick={onNext}
					fullWidth
					size="large"
					sx={{ 
						maxWidth: { sm: '48%' },
						order: { xs: 1, sm: 2 }
					}}
				>
					{FORM_CONSTANTS.NAVIGATION_LABELS.next}
				</Button>
			)}
		</Box>
	);
};
