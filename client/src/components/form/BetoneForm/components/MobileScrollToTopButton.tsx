import React from 'react'
import { Fab, Zoom, useTheme, Box, Tooltip } from '@mui/material'
import {
	KeyboardArrowUp as ArrowUpIcon,
	TouchApp as TouchIcon,
} from '@mui/icons-material'

interface MobileScrollToTopButtonProps {
	show: boolean
	onClick: () => void
	isMobile?: boolean
}

export const MobileScrollToTopButton: React.FC<
	MobileScrollToTopButtonProps
> = ({ show, onClick, isMobile = false }) => {
	const theme = useTheme()

	const buttonSize = isMobile ? 'large' : 'medium'
	const iconSize = isMobile ? 'medium' : 'small'

	return (
		<Zoom in={show} timeout={300}>
			<Box
				sx={{
					position: 'fixed',
					bottom: isMobile ? 24 : 16,
					right: isMobile ? 24 : 16,
					zIndex: 1000,
				}}
			>
				<Tooltip
					title={isMobile ? 'Наверх' : 'Прокрутить наверх'}
					placement='left'
				>
					<Fab
						color='primary'
						size={buttonSize}
						onClick={onClick}
						sx={{
							boxShadow: isMobile ? theme.shadows[8] : theme.shadows[4],
							transition: 'all 0.3s ease-in-out',

							// Мобильные улучшения
							...(isMobile && {
								width: 64,
								height: 64,
								'&:hover': {
									transform: 'translateY(-2px)',
									boxShadow: theme.shadows[12],
								},
								'&:active': {
									transform: 'translateY(0)',
									boxShadow: theme.shadows[8],
								},
							}),

							// Десктопные стили
							...(!isMobile && {
								'&:hover': {
									transform: 'translateY(-1px)',
									boxShadow: theme.shadows[6],
								},
							}),

							// Анимация пульса для привлечения внимания
							'&::before': {
								content: '""',
								position: 'absolute',
								top: '50%',
								left: '50%',
								width: '100%',
								height: '100%',
								borderRadius: '50%',
								border: `2px solid ${theme.palette.primary.main}`,
								transform: 'translate(-50%, -50%)',
								animation: 'pulse 2s infinite',
								opacity: 0.3,
							},
						}}
					>
						<Box
							sx={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								flexDirection: isMobile ? 'column' : 'row',
								gap: isMobile ? 0.25 : 0,
							}}
						>
							<ArrowUpIcon fontSize={iconSize} />
							{isMobile && (
								<TouchIcon
									fontSize='inherit'
									sx={{
										fontSize: '0.75rem',
										opacity: 0.8,
									}}
								/>
							)}
						</Box>
					</Fab>
				</Tooltip>

				{/* CSS для анимации пульса */}
				<style>
					{`
						@keyframes pulse {
							0% {
								transform: translate(-50%, -50%) scale(1);
								opacity: 0.3;
							}
							50% {
								transform: translate(-50%, -50%) scale(1.1);
								opacity: 0.1;
							}
							100% {
								transform: translate(-50%, -50%) scale(1.2);
								opacity: 0;
							}
						}
					`}
				</style>
			</Box>
		</Zoom>
	)
}
