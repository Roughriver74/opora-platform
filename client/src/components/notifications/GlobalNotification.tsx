import React from 'react'
import {
	Dialog,
	DialogContent,
	Box,
	Typography,
	Fade,
	useTheme,
	alpha,
} from '@mui/material'
import {
	CheckCircleOutlined,
	ErrorOutlineOutlined,
	InfoOutlined,
	WarningAmberOutlined,
} from '@mui/icons-material'

export interface GlobalNotificationProps {
	open: boolean
	type: 'success' | 'error' | 'info' | 'warning'
	title?: string
	message: string
	onClose?: () => void
	autoHideDuration?: number
}

const iconMap = {
	success: CheckCircleOutlined,
	error: ErrorOutlineOutlined,
	info: InfoOutlined,
	warning: WarningAmberOutlined,
}

const colorMap = {
	success: '#4caf50',
	error: '#f44336',
	info: '#2196f3',
	warning: '#ff9800',
}

export const GlobalNotification: React.FC<GlobalNotificationProps> = ({
	open,
	type,
	title,
	message,
	onClose,
	autoHideDuration = 3000,
}) => {
	const theme = useTheme()
	const IconComponent = iconMap[type]
	const color = colorMap[type]

	// Автозакрытие через заданное время
	React.useEffect(() => {
		if (open && autoHideDuration > 0) {
			const timer = setTimeout(() => {
				onClose?.()
			}, autoHideDuration)

			return () => clearTimeout(timer)
		}
	}, [open, autoHideDuration, onClose])

	return (
		<Dialog
			open={open}
			onClose={onClose}
			maxWidth="sm"
			fullWidth
			PaperProps={{
				sx: {
					borderRadius: 3,
					boxShadow: theme.shadows[24],
					background: alpha(theme.palette.background.paper, 0.98),
					backdropFilter: 'blur(10px)',
					border: `2px solid ${color}`,
					overflow: 'visible',
					position: 'relative',
				},
			}}
			sx={{
				'& .MuiBackdrop-root': {
					backgroundColor: alpha(theme.palette.common.black, 0.3),
					backdropFilter: 'blur(4px)',
				},
			}}
		>
			<Fade in={open} timeout={300}>
				<DialogContent sx={{ p: 4, textAlign: 'center' }}>
					{/* Иконка */}
					<Box
						sx={{
							display: 'flex',
							justifyContent: 'center',
							mb: 2,
						}}
					>
						<Box
							sx={{
								width: 80,
								height: 80,
								borderRadius: '50%',
								backgroundColor: alpha(color, 0.1),
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								border: `3px solid ${color}`,
							}}
						>
							<IconComponent
								sx={{
									fontSize: 40,
									color: color,
								}}
							/>
						</Box>
					</Box>

					{/* Заголовок */}
					{title && (
						<Typography
							variant="h5"
							component="h2"
							gutterBottom
							sx={{
								fontWeight: 600,
								color: theme.palette.text.primary,
								mb: 1,
							}}
						>
							{title}
						</Typography>
					)}

					{/* Сообщение */}
					<Typography
						variant="body1"
						sx={{
							color: theme.palette.text.secondary,
							lineHeight: 1.6,
							fontSize: '1.1rem',
						}}
					>
						{message}
					</Typography>

					{/* Индикатор автозакрытия */}
					{autoHideDuration > 0 && (
						<Box
							sx={{
								position: 'absolute',
								bottom: 0,
								left: 0,
								right: 0,
								height: 4,
								backgroundColor: alpha(color, 0.2),
								borderRadius: '0 0 12px 12px',
								overflow: 'hidden',
							}}
						>
							<Box
								sx={{
									height: '100%',
									backgroundColor: color,
									animation: `shrink ${autoHideDuration}ms linear`,
									'@keyframes shrink': {
										from: { width: '100%' },
										to: { width: '0%' },
									},
								}}
							/>
						</Box>
					)}
				</DialogContent>
			</Fade>
		</Dialog>
	)
}

export default GlobalNotification