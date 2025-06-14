import React from 'react';
import { Fab } from '@mui/material';
import { ArrowUpward } from '@mui/icons-material';
import { getFabSize } from '../utils/formHelpers';

interface ScrollToTopButtonProps {
	show: boolean;
	onClick: () => void;
}

export const ScrollToTopButton: React.FC<ScrollToTopButtonProps> = ({
	show,
	onClick,
}) => {
	if (!show) {
		return null;
	}

	return (
		<Fab
			color="primary"
			size={getFabSize()}
			onClick={onClick}
			sx={{
				position: 'fixed',
				bottom: { xs: 16, sm: 20 },
				right: { xs: 16, sm: 20 },
				zIndex: 1000,
			}}
		>
			<ArrowUpward />
		</Fab>
	);
};
