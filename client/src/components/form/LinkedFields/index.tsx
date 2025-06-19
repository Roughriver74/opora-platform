import React, { useState } from 'react'
import {
	Box,
	Alert,
	Snackbar,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Typography,
} from '@mui/material'
import { useLinkedFields } from './hooks/useLinkedFields'
import { CopyButton } from './components/CopyButton'
import { CopyPreview } from './components/CopyPreview'
import { FormSection } from '../BetoneForm/types'
import { CopyPreview as CopyPreviewType } from './types'

interface LinkedFieldsProps {
	sections: FormSection[]
	values: Record<string, any>
	onValuesChange: (values: Record<string, any>) => void
	sourceSection?: string // Если указана, показывает только кнопку для этой секции
	showInline?: boolean // Показывать ли кнопку прямо в форме
}

export const LinkedFields: React.FC<LinkedFieldsProps> = ({
	sections,
	values,
	onValuesChange,
	sourceSection,
	showInline = false,
}) => {
	const [previewDialog, setPreviewDialog] = useState<{
		open: boolean
		preview: CopyPreviewType | null
	}>({ open: false, preview: null })

	const [notification, setNotification] = useState<{
		open: boolean
		message: string
		type: 'success' | 'error' | 'warning'
	}>({ open: false, message: '', type: 'success' })

	const linkedFields = useLinkedFields({
		sections,
		values,
		onValuesChange,
	})

	const handleCopyRequest = (fromSection: string, toSection: string) => {
		// Создаем превью для подтверждения
		const preview = linkedFields.createCopyPreview(fromSection, toSection)

		if (!preview || preview.changes.length === 0) {
			setNotification({
				open: true,
				message: 'Нет данных для копирования',
				type: 'warning',
			})
			return
		}

		// Проверяем наличие перезаписываемых полей
		const hasOverwrites = preview.changes.some(change => change.isOverwrite)

		if (hasOverwrites) {
			// Показываем диалог подтверждения
			setPreviewDialog({ open: true, preview })
		} else {
			// Копируем сразу
			performCopy(fromSection, toSection)
		}
	}

	const handlePreviewRequest = (
		fromSection: string,
		toSection: string
	): CopyPreviewType | null => {
		return linkedFields.createCopyPreview(fromSection, toSection)
	}

	const performCopy = async (fromSection: string, toSection: string) => {
		try {
			const success = await linkedFields.copyFieldsBetweenSections(
				fromSection,
				toSection
			)

			if (success) {
				setNotification({
					open: true,
					message: `Поля успешно скопированы из "${fromSection}" в "${toSection}"`,
					type: 'success',
				})
			} else {
				setNotification({
					open: true,
					message: 'Не удалось скопировать поля',
					type: 'error',
				})
			}
		} catch (error) {
			console.error('Ошибка при копировании полей:', error)
			setNotification({
				open: true,
				message: 'Произошла ошибка при копировании полей',
				type: 'error',
			})
		}
	}

	const handleConfirmCopy = () => {
		const { preview } = previewDialog
		if (preview) {
			performCopy(preview.operation.fromSection, preview.operation.toSection)
		}
		setPreviewDialog({ open: false, preview: null })
	}

	const handleCancelCopy = () => {
		setPreviewDialog({ open: false, preview: null })
	}

	const handleCloseNotification = () => {
		setNotification({ ...notification, open: false })
	}

	// Если указана конкретная секция, показываем кнопку только для неё
	if (sourceSection) {
		const targetSections = linkedFields.getTargetSectionsFor(sourceSection)

		return (
			<>
				<CopyButton
					sourceSection={sourceSection}
					targetSections={targetSections}
					onCopyRequest={handleCopyRequest}
					onPreviewRequest={handlePreviewRequest}
					size='small'
					variant='outlined'
				/>

				{/* Диалог подтверждения */}
				<Dialog
					open={previewDialog.open}
					onClose={handleCancelCopy}
					maxWidth='md'
					fullWidth
				>
					<DialogTitle>Подтверждение копирования полей</DialogTitle>
					<DialogContent>
						{previewDialog.preview && (
							<CopyPreview preview={previewDialog.preview} expanded={true} />
						)}
					</DialogContent>
					<DialogActions>
						<Button onClick={handleCancelCopy}>Отмена</Button>
						<Button
							onClick={handleConfirmCopy}
							variant='contained'
							color='primary'
						>
							Подтвердить копирование
						</Button>
					</DialogActions>
				</Dialog>

				{/* Уведомления */}
				<Snackbar
					open={notification.open}
					autoHideDuration={4000}
					onClose={handleCloseNotification}
					anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
				>
					<Alert
						onClose={handleCloseNotification}
						severity={notification.type}
						sx={{ width: '100%' }}
					>
						{notification.message}
					</Alert>
				</Snackbar>
			</>
		)
	}

	// Показываем полный интерфейс для всех секций
	return (
		<Box sx={{ mt: 2 }}>
			<Typography variant='h6' gutterBottom>
				Связанные поля
			</Typography>

			<Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
				Копируйте данные между секциями формы для ускорения заполнения
			</Typography>

			{/* Кнопки копирования для каждой секции */}
			<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
				{sections.map(section => {
					const targetSections = linkedFields.getTargetSectionsFor(
						section.title
					)

					if (targetSections.length === 0) {
						return null
					}

					return (
						<Box
							key={section.title}
							sx={{
								p: 2,
								border: 1,
								borderColor: 'divider',
								borderRadius: 1,
								bgcolor: 'background.paper',
							}}
						>
							<Typography variant='subtitle1' gutterBottom>
								{section.title}
							</Typography>

							<CopyButton
								sourceSection={section.title}
								targetSections={targetSections}
								onCopyRequest={handleCopyRequest}
								onPreviewRequest={handlePreviewRequest}
							/>
						</Box>
					)
				})}
			</Box>

			{/* История операций */}
			{linkedFields.canUndo && (
				<Box
					sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}
				>
					<Typography variant='subtitle2' gutterBottom>
						История операций
					</Typography>
					<Button
						size='small'
						onClick={linkedFields.undoLastCopy}
						disabled={!linkedFields.canUndo}
					>
						Отменить последнее копирование
					</Button>
				</Box>
			)}

			<Dialog
				open={previewDialog.open}
				onClose={handleCancelCopy}
				maxWidth='md'
				fullWidth
			>
				<DialogTitle>Подтверждение копирования полей</DialogTitle>
				<DialogContent>
					{previewDialog.preview && (
						<CopyPreview preview={previewDialog.preview} expanded={true} />
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCancelCopy}>Отмена</Button>
					<Button
						onClick={handleConfirmCopy}
						variant='contained'
						color='primary'
					>
						Подтвердить копирование
					</Button>
				</DialogActions>
			</Dialog>

			<Snackbar
				open={notification.open}
				autoHideDuration={4000}
				onClose={handleCloseNotification}
				anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
			>
				<Alert
					onClose={handleCloseNotification}
					severity={notification.type}
					sx={{ width: '100%' }}
				>
					{notification.message}
				</Alert>
			</Snackbar>
		</Box>
	)
}
