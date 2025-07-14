import React from 'react'
import {
	Button,
	CircularProgress,
	Box,
	useTheme,
	Typography,
	Stack,
} from '@mui/material'
import {
	Send as SendIcon,
	TouchApp as TouchIcon,
	CheckCircle as CheckIcon,
} from '@mui/icons-material'

interface MobileSubmitButtonProps {
	submitting: boolean
	variant?: 'primary' | 'success'
	fullWidth?: boolean
	isMobile?: boolean
	disabled?: boolean
	onClick?: () => void
}

export const MobileSubmitButton: React.FC<MobileSubmitButtonProps> = ({
	submitting,
	variant = 'primary',
	fullWidth = true,
	isMobile = false,
	disabled = false,
	onClick,
}) => {
	const theme = useTheme()

	const getButtonColor = () => {
		switch (variant) {
			case 'success':
				return 'success'
			default:
				return 'primary'
		}
	}

	const getButtonText = () => {
		if (submitting) {
			return isMobile ? 'Отправка...' : 'Отправка формы...'
		}

		switch (variant) {
			case 'success':
				return isMobile ? 'Готово' : 'Отправить форму'
			default:
				return isMobile ? 'Отправить' : 'Отправить форму'
		}
	}

	const getButtonIcon = () => {
		if (submitting) {
			return (
				<CircularProgress
					size={isMobile ? 20 : 24}
					color='inherit'
					thickness={4}
				/>
			)
		}

		switch (variant) {
			case 'success':
				return <CheckIcon fontSize={isMobile ? 'medium' : 'large'} />
			default:
				return <SendIcon fontSize={isMobile ? 'medium' : 'large'} />
		}
	}

	return (
		<Box
			sx={{
				position: isMobile ? 'sticky' : 'static',
				bottom: isMobile ? 16 : 'auto',
				zIndex: isMobile ? 1000 : 'auto',
				bgcolor: isMobile ? 'background.paper' : 'transparent',
				p: isMobile ? 2 : 0,
				mx: isMobile ? -2 : 0,
				borderTop: isMobile ? '1px solid' : 'none',
				borderColor: isMobile ? 'divider' : 'transparent',
				boxShadow: isMobile ? '0 -2px 8px rgba(0, 0, 0, 0.1)' : 'none',
			}}
		>
			<Button
				type='submit'
				variant='contained'
				color={getButtonColor()}
				fullWidth={fullWidth}
				disabled={disabled || submitting}
				onClick={onClick}
				startIcon={getButtonIcon()}
				sx={{
					minHeight: isMobile ? 56 : 48,
					fontSize: isMobile ? '1.1rem' : '1rem',
					fontWeight: 600,
					borderRadius: isMobile ? 2 : 1,
					boxShadow: isMobile ? theme.shadows[4] : theme.shadows[2],
					textTransform: 'none',
					transition: 'all 0.2s ease-in-out',

					'&:hover': !submitting
						? {
								transform: isMobile ? 'translateY(-1px)' : 'none',
								boxShadow: isMobile ? theme.shadows[8] : theme.shadows[4],
						  }
						: {},

					'&:active': {
						transform: isMobile ? 'translateY(0)' : 'none',
					},

					'&:disabled': {
						transform: 'none',
						boxShadow: theme.shadows[1],
					},

					// Дополнительные стили для мобильных
					...(isMobile && {
						py: 1.5,
						position: 'relative',
						overflow: 'hidden',

						'&::before': submitting
							? {
									content: '""',
									position: 'absolute',
									top: 0,
									left: '-100%',
									width: '100%',
									height: '100%',
									background:
										'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
									animation: 'shimmer 1.5s infinite',
							  }
							: {},
					}),
				}}
			>
				<Stack direction='row' alignItems='center' spacing={1}>
					{/* Основной текст */}
					<Typography
						variant='button'
						sx={{
							fontSize: 'inherit',
							fontWeight: 'inherit',
						}}
					>
						{getButtonText()}
					</Typography>

					{/* Дополнительная иконка для мобильных */}
					{isMobile && !submitting && (
						<TouchIcon
							fontSize='small'
							sx={{
								opacity: 0.7,
								ml: 0.5,
							}}
						/>
					)}
				</Stack>
			</Button>

			{/* Дополнительная информация для мобильных */}
			{isMobile && submitting && (
				<Typography
					variant='caption'
					color='text.secondary'
					sx={{
						display: 'block',
						textAlign: 'center',
						mt: 1,
						fontSize: '0.75rem',
					}}
				>
					Пожалуйста, подождите...
				</Typography>
			)}

			{/* CSS для анимации мерцания */}
			<style>
				{`
					@keyframes shimmer {
						0% { left: -100%; }
						100% { left: 100%; }
					}
				`}
			</style>
		</Box>
	)
}
