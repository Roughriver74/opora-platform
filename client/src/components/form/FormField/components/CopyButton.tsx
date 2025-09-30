import React, { useState, useCallback } from 'react'
import { IconButton, Tooltip, Snackbar, Alert } from '@mui/material'
import { ContentCopy } from '@mui/icons-material'

interface CopyButtonProps {
	value: any
	disabled?: boolean
	size?: 'small' | 'medium'
	compact?: boolean
	isMobile?: boolean
}

export const CopyButton: React.FC<CopyButtonProps> = React.memo(
	({
		value,
		disabled = false,
		size = 'small',
		compact = false,
		isMobile = false,
	}) => {
		const [showSuccess, setShowSuccess] = useState(false)
		const [error, setError] = useState<string | null>(null)

		const handleCopy = useCallback(async () => {
			try {
				// Преобразуем значение в строку для копирования
				const textToCopy =
					value !== null && value !== undefined ? String(value) : ''

				if (!textToCopy) {
					setError('Нет данных для копирования')
					return
				}

				// Используем современный Clipboard API
				if (navigator.clipboard && window.isSecureContext) {
					await navigator.clipboard.writeText(textToCopy)
				} else {
					// Fallback для старых браузеров или небезопасных контекстов
					const textArea = document.createElement('textarea')
					textArea.value = textToCopy
					textArea.style.position = 'fixed'
					textArea.style.left = '-999999px'
					textArea.style.top = '-999999px'
					document.body.appendChild(textArea)
					textArea.focus()
					textArea.select()

					const successful = document.execCommand('copy')
					document.body.removeChild(textArea)

					if (!successful) {
						throw new Error('Не удалось скопировать текст')
					}
				}

				setShowSuccess(true)
				setError(null)
			} catch (err) {
				console.error('Ошибка при копировании:', err)
				setError('Не удалось скопировать значение')
			}
		}, [value])

		const handleCloseSuccess = useCallback(() => {
			setShowSuccess(false)
		}, [])

		const handleCloseError = useCallback(() => {
			setError(null)
		}, [])

		// Определяем размеры кнопки в зависимости от режима
		const buttonSize = isMobile ? 'small' : compact ? 'small' : size
		const iconSize = isMobile ? 16 : compact ? 18 : 20

		return (
			<>
				<Tooltip title='Копировать значение' arrow>
					<IconButton
						size={buttonSize}
						onClick={handleCopy}
						disabled={disabled || !value}
						sx={{
							padding: isMobile ? '4px' : compact ? '6px' : '8px',
							marginLeft: '4px', marginBottom: '4px',
							'&:hover': {
								backgroundColor: 'action.hover',
							},
						}}
					>
						<ContentCopy sx={{ fontSize: iconSize }} />
					</IconButton>
				</Tooltip>

				{/* Уведомление об успешном копировании */}
				<Snackbar
					open={showSuccess}
					autoHideDuration={2000}
					onClose={handleCloseSuccess}
					anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
				>
					<Alert
						onClose={handleCloseSuccess}
						severity='success'
						sx={{ width: '100%' }}
					>
						Значение скопировано в буфер обмена
					</Alert>
				</Snackbar>

				{/* Уведомление об ошибке */}
				<Snackbar
					open={!!error}
					autoHideDuration={3000}
					onClose={handleCloseError}
					anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
				>
					<Alert
						onClose={handleCloseError}
						severity='error'
						sx={{ width: '100%' }}
					>
						{error}
					</Alert>
				</Snackbar>
			</>
		)
	}
)
