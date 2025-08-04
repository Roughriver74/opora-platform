import React, {
	createContext,
	useContext,
	useState,
	useCallback,
	ReactNode,
} from 'react'
import { Snackbar, Alert, AlertColor, Slide, SlideProps } from '@mui/material'

interface NotificationData {
	id: string
	message: string
	severity: AlertColor
	autoHideDuration?: number
}

interface NotificationContextType {
	showNotification: (
		message: string,
		severity?: AlertColor,
		autoHideDuration?: number
	) => void
	showSuccess: (message: string) => void
	showError: (message: string) => void
	showWarning: (message: string) => void
	showInfo: (message: string) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(
	undefined
)

function SlideTransition(props: SlideProps) {
	return <Slide {...props} direction='down' />
}

interface NotificationProviderProps {
	children: ReactNode
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
	children,
}) => {
	const [notifications, setNotifications] = useState<NotificationData[]>([])

	const showNotification = useCallback(
		(
			message: string,
			severity: AlertColor = 'info',
			autoHideDuration: number = 6000
		) => {
			const id = Date.now().toString()
			const notification: NotificationData = {
				id,
				message,
				severity,
				autoHideDuration,
			}

			setNotifications(prev => [...prev, notification])
		},
		[]
	)

	const showSuccess = useCallback(
		(message: string) => {
			showNotification(message, 'success')
		},
		[showNotification]
	)

	const showError = useCallback(
		(message: string) => {
			showNotification(message, 'error', 8000) // Ошибки показываем дольше
		},
		[showNotification]
	)

	const showWarning = useCallback(
		(message: string) => {
			showNotification(message, 'warning')
		},
		[showNotification]
	)

	const showInfo = useCallback(
		(message: string) => {
			showNotification(message, 'info')
		},
		[showNotification]
	)

	const handleClose = useCallback((id: string) => {
		setNotifications(prev =>
			prev.filter(notification => notification.id !== id)
		)
	}, [])

	const contextValue: NotificationContextType = {
		showNotification,
		showSuccess,
		showError,
		showWarning,
		showInfo,
	}

	return (
		<NotificationContext.Provider value={contextValue}>
			{children}
			{notifications.map(notification => (
				<Snackbar
					key={notification.id}
					open={true}
					autoHideDuration={notification.autoHideDuration}
					onClose={() => handleClose(notification.id)}
					anchorOrigin={{
						vertical: 'top',
						horizontal: 'center',
					}}
					TransitionComponent={SlideTransition}
					sx={{
						zIndex: 9999,
						'& .MuiSnackbarContent-root': {
							minWidth: '300px',
						},
					}}
				>
					<Alert
						onClose={() => handleClose(notification.id)}
						severity={notification.severity}
						variant='filled'
						sx={{
							width: '100%',
							fontSize: '1rem',
							fontWeight: 500,
							boxShadow: 3,
							'& .MuiAlert-icon': {
								fontSize: '1.5rem',
							},
							'& .MuiAlert-message': {
								fontSize: '1rem',
								fontWeight: 500,
							},
						}}
					>
						{notification.message}
					</Alert>
				</Snackbar>
			))}
		</NotificationContext.Provider>
	)
}

export const useNotification = (): NotificationContextType => {
	const context = useContext(NotificationContext)
	if (!context) {
		throw new Error(
			'useNotification must be used within a NotificationProvider'
		)
	}
	return context
}
