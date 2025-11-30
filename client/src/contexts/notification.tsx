import React, { createContext, useContext, useState, useCallback } from 'react'
import GlobalNotification from '../components/notifications/GlobalNotification'

// Тип для настроек уведомления
export interface NotificationSettings {
	type: 'success' | 'error' | 'info' | 'warning'
	title?: string
	message: string
	autoHideDuration?: number
	onAfterShow?: () => void // Callback после показа уведомления
	onAfterHide?: () => void // Callback после скрытия уведомления
}

// Тип для контекста
interface NotificationContextType {
	showNotification: (settings: NotificationSettings) => void
	hideNotification: () => void
	isVisible: boolean
}

// Создаем контекст
const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

// Провайдер контекста
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [notification, setNotification] = useState<{
		visible: boolean
		settings: NotificationSettings | null
	}>({
		visible: false,
		settings: null,
	})

	// Функция для показа уведомления
	const showNotification = useCallback((settings: NotificationSettings) => {
		setNotification({
			visible: true,
			settings,
		})

		// Вызываем callback после показа
		if (settings.onAfterShow) {
			// Небольшая задержка для завершения анимации
			setTimeout(settings.onAfterShow, 300)
		}
	}, [])

	// Функция для скрытия уведомления
	const hideNotification = useCallback(() => {
		const currentSettings = notification.settings

		setNotification({
			visible: false,
			settings: null,
		})

		// Вызываем callback после скрытия
		if (currentSettings?.onAfterHide) {
			// Небольшая задержка для завершения анимации
			setTimeout(currentSettings.onAfterHide, 300)
		}
	}, [notification.settings])

	// Значение контекста
	const contextValue: NotificationContextType = {
		showNotification,
		hideNotification,
		isVisible: notification.visible,
	}

	return (
		<NotificationContext.Provider value={contextValue}>
			{children}

			{/* Компонент глобального уведомления */}
			{notification.settings && (
				<GlobalNotification
					open={notification.visible}
					type={notification.settings.type}
					title={notification.settings.title}
					message={notification.settings.message}
					onClose={hideNotification}
					autoHideDuration={notification.settings.autoHideDuration}
				/>
			)}
		</NotificationContext.Provider>
	)
}

// Хук для использования контекста
export const useNotification = (): NotificationContextType => {
	const context = useContext(NotificationContext)
	
	if (context === undefined) {
		throw new Error('useNotification must be used within a NotificationProvider')
	}
	
	return context
}

// Удобные методы для разных типов уведомлений
export const useNotificationHelpers = () => {
	const { showNotification, hideNotification } = useNotification()

	return {
		showSuccess: (
			message: string,
			options?: {
				title?: string
				autoHideDuration?: number
				onAfterShow?: () => void
				onAfterHide?: () => void
			}
		) => {
			showNotification({
				type: 'success',
				message,
				title: options?.title || 'Успешно!',
				autoHideDuration: options?.autoHideDuration || 3000,
				onAfterShow: options?.onAfterShow,
				onAfterHide: options?.onAfterHide,
			})
		},
		
		showError: (
			message: string,
			options?: {
				title?: string
				autoHideDuration?: number
				onAfterShow?: () => void
				onAfterHide?: () => void
			}
		) => {
			showNotification({
				type: 'error',
				message,
				title: options?.title || 'Ошибка!',
				autoHideDuration: options?.autoHideDuration || 5000,
				onAfterShow: options?.onAfterShow,
				onAfterHide: options?.onAfterHide,
			})
		},
		
		showInfo: (
			message: string,
			options?: {
				title?: string
				autoHideDuration?: number
				onAfterShow?: () => void
				onAfterHide?: () => void
			}
		) => {
			showNotification({
				type: 'info',
				message,
				title: options?.title || 'Информация',
				autoHideDuration: options?.autoHideDuration || 4000,
				onAfterShow: options?.onAfterShow,
				onAfterHide: options?.onAfterHide,
			})
		},
		
		showWarning: (
			message: string,
			options?: {
				title?: string
				autoHideDuration?: number
				onAfterShow?: () => void
				onAfterHide?: () => void
			}
		) => {
			showNotification({
				type: 'warning',
				message,
				title: options?.title || 'Внимание!',
				autoHideDuration: options?.autoHideDuration || 4000,
				onAfterShow: options?.onAfterShow,
				onAfterHide: options?.onAfterHide,
			})
		},
		
		hideNotification,
	}
}