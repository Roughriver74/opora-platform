import React from 'react'
import {
	Alert,
	Box,
	Button,
	Stack,
	useTheme,
	useMediaQuery,
} from '@mui/material'
import { CheckCircle, TouchApp } from '@mui/icons-material'
import { SubmitResult } from '../types'

interface FormResultProps {
	result: SubmitResult | null
	onClose?: () => void
	onReset?: () => void
	isMobile?: boolean
}

export const FormResult: React.FC<FormResultProps> = ({
	result,
	onClose,
	onReset,
	isMobile = false,
}) => {
	const theme = useTheme()
	const isMobileQuery = useMediaQuery(theme.breakpoints.down('sm'))
	const actuallyMobile = isMobile || isMobileQuery

	if (!result) {
		return null
	}

	return (
		<Box 
			sx={{ 
				mb: actuallyMobile ? 2 : 3,
				mx: actuallyMobile ? 1 : 0,
			}}
		>
			<Alert
				severity={result.success ? 'success' : 'error'}
				icon={result.success ? <CheckCircle /> : undefined}
				action={
					actuallyMobile ? undefined : (
						<Stack direction='row' spacing={1}>
							{onClose && (
								<Button 
									color='inherit' 
									size='small' 
									onClick={onClose}
								>
									Закрыть
								</Button>
							)}
							{result.success && onReset && (
								<Button 
									color='inherit' 
									size='small' 
									onClick={onReset}
								>
									Новая заявка
								</Button>
							)}
						</Stack>
					)
				}
				sx={{
					'& .MuiAlert-message': {
						flex: 1,
						fontSize: actuallyMobile ? '0.9rem' : '1rem',
						lineHeight: 1.5,
					},
					borderRadius: actuallyMobile ? 2 : 1,
					boxShadow: actuallyMobile ? theme.shadows[2] : 'none',
				}}
			>
				{result.message}

				{/* Мобильные кнопки внизу */}
				{actuallyMobile && (
					<Stack 
						direction={actuallyMobile ? 'column' : 'row'} 
						spacing={1} 
						sx={{ mt: 2 }}
					>
						{result.success && onReset && (
							<Button 
								variant='contained'
								color={result.success ? 'success' : 'primary'}
								onClick={onReset}
								fullWidth={actuallyMobile}
								startIcon={actuallyMobile ? <TouchApp /> : undefined}
								sx={{
									minHeight: actuallyMobile ? 48 : 'auto',
									fontSize: actuallyMobile ? '1rem' : '0.875rem',
									textTransform: 'none',
								}}
							>
								Создать новую заявку
							</Button>
						)}
						{onClose && (
							<Button 
								variant='outlined'
								color='inherit'
								onClick={onClose}
								fullWidth={actuallyMobile}
								sx={{
									minHeight: actuallyMobile ? 48 : 'auto',
									fontSize: actuallyMobile ? '1rem' : '0.875rem',
									textTransform: 'none',
								}}
							>
								Закрыть
							</Button>
						)}
					</Stack>
				)}
			</Alert>
		</Box>
	)
}
