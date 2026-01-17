import React, { useCallback, useState } from 'react'
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Box,
	Typography,
	Alert,
	CircularProgress,
	List,
	ListItem,
	ListItemIcon,
	ListItemText,
	Chip,
	Stack,
	LinearProgress,
} from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import WarningIcon from '@mui/icons-material/Warning'
import { useImportNomenclature } from '../hooks/useNomenclature'
import { ImportResult, NomenclatureService } from '../../../../services/nomenclatureService'

interface NomenclatureImportDialogProps {
	open: boolean
	onClose: () => void
}

export const NomenclatureImportDialog: React.FC<NomenclatureImportDialogProps> = ({
	open,
	onClose,
}) => {
	const [file, setFile] = useState<File | null>(null)
	const [dragActive, setDragActive] = useState(false)
	const [result, setResult] = useState<ImportResult | null>(null)

	const importMutation = useImportNomenclature()

	const handleDrag = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		if (e.type === 'dragenter' || e.type === 'dragover') {
			setDragActive(true)
		} else if (e.type === 'dragleave') {
			setDragActive(false)
		}
	}, [])

	const handleDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		setDragActive(false)

		if (e.dataTransfer.files?.[0]) {
			const droppedFile = e.dataTransfer.files[0]
			if (isValidFile(droppedFile)) {
				setFile(droppedFile)
				setResult(null)
			}
		}
	}, [])

	const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files?.[0]) {
			const selectedFile = e.target.files[0]
			if (isValidFile(selectedFile)) {
				setFile(selectedFile)
				setResult(null)
			}
		}
	}, [])

	const isValidFile = (f: File) => {
		const validTypes = [
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'application/vnd.ms-excel',
		]
		return validTypes.includes(f.type) || f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
	}

	const handleImport = async () => {
		if (!file) return

		try {
			const importResult = await importMutation.mutateAsync(file)
			setResult(importResult)
		} catch (err) {
			console.error('Import error:', err)
		}
	}

	const handleDownloadTemplate = async () => {
		try {
			const blob = await NomenclatureService.downloadTemplate()
			NomenclatureService.downloadFile(blob, 'nomenclature_template.xlsx')
		} catch (err) {
			console.error('Download template error:', err)
		}
	}

	const handleClose = () => {
		setFile(null)
		setResult(null)
		onClose()
	}

	return (
		<Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
			<DialogTitle>Импорт номенклатуры из Excel</DialogTitle>

			<DialogContent>
				{/* Drag & Drop Zone */}
				{!result && (
					<Box
						onDragEnter={handleDrag}
						onDragLeave={handleDrag}
						onDragOver={handleDrag}
						onDrop={handleDrop}
						sx={{
							border: '2px dashed',
							borderColor: dragActive ? 'primary.main' : 'divider',
							borderRadius: 2,
							p: 4,
							textAlign: 'center',
							bgcolor: dragActive ? 'action.hover' : 'background.default',
							cursor: 'pointer',
							transition: 'all 0.2s',
							mb: 2,
						}}
						onClick={() => document.getElementById('import-file-input')?.click()}
					>
						<input
							id='import-file-input'
							type='file'
							accept='.xlsx,.xls'
							onChange={handleFileChange}
							style={{ display: 'none' }}
						/>
						<CloudUploadIcon
							sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }}
						/>
						<Typography variant='body1' gutterBottom>
							Перетащите файл Excel сюда или нажмите для выбора
						</Typography>
						<Typography variant='body2' color='text.secondary'>
							Поддерживаются форматы .xlsx и .xls
						</Typography>
					</Box>
				)}

				{/* Selected File */}
				{file && !result && (
					<Box
						sx={{
							display: 'flex',
							alignItems: 'center',
							p: 2,
							bgcolor: 'background.paper',
							borderRadius: 1,
							border: '1px solid',
							borderColor: 'divider',
							mb: 2,
						}}
					>
						<InsertDriveFileIcon sx={{ mr: 2, color: 'success.main' }} />
						<Box flexGrow={1}>
							<Typography variant='body2'>{file.name}</Typography>
							<Typography variant='caption' color='text.secondary'>
								{(file.size / 1024).toFixed(1)} KB
							</Typography>
						</Box>
						<Button
							size='small'
							color='error'
							onClick={() => setFile(null)}
						>
							Удалить
						</Button>
					</Box>
				)}

				{/* Loading */}
				{importMutation.isPending && (
					<Box sx={{ mb: 2 }}>
						<LinearProgress />
						<Typography
							variant='body2'
							color='text.secondary'
							sx={{ mt: 1, textAlign: 'center' }}
						>
							Импортируем данные...
						</Typography>
					</Box>
				)}

				{/* Error */}
				{importMutation.error && !result && (
					<Alert severity='error' sx={{ mb: 2 }}>
						{(importMutation.error as Error).message}
					</Alert>
				)}

				{/* Result */}
				{result && (
					<Box>
						<Alert
							severity={result.errors.length > 0 ? 'warning' : 'success'}
							sx={{ mb: 2 }}
						>
							{result.message}
						</Alert>

						<Stack direction='row' spacing={1} mb={2} flexWrap='wrap'>
							<Chip
								icon={<CheckCircleIcon />}
								label={`Всего: ${result.total}`}
								variant='outlined'
							/>
							<Chip
								icon={<CheckCircleIcon />}
								label={`Создано: ${result.created}`}
								color='success'
							/>
							<Chip
								icon={<CheckCircleIcon />}
								label={`Обновлено: ${result.updated}`}
								color='primary'
							/>
							{result.skipped > 0 && (
								<Chip
									icon={<WarningIcon />}
									label={`Пропущено: ${result.skipped}`}
									color='warning'
								/>
							)}
							{result.errors.length > 0 && (
								<Chip
									icon={<ErrorIcon />}
									label={`Ошибок: ${result.errors.length}`}
									color='error'
								/>
							)}
						</Stack>

						{result.errors.length > 0 && (
							<Box>
								<Typography variant='subtitle2' gutterBottom>
									Ошибки импорта:
								</Typography>
								<List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
									{result.errors.slice(0, 10).map((err, index) => (
										<ListItem key={index}>
											<ListItemIcon>
												<ErrorIcon color='error' fontSize='small' />
											</ListItemIcon>
											<ListItemText
												primary={`Строка ${err.row}: ${err.message}`}
												primaryTypographyProps={{ variant: 'body2' }}
											/>
										</ListItem>
									))}
									{result.errors.length > 10 && (
										<ListItem>
											<ListItemText
												primary={`... и ещё ${result.errors.length - 10} ошибок`}
												primaryTypographyProps={{
													variant: 'body2',
													color: 'text.secondary',
												}}
											/>
										</ListItem>
									)}
								</List>
							</Box>
						)}
					</Box>
				)}

				{/* Help */}
				{!result && (
					<Alert severity='info' sx={{ mt: 2 }}>
						<Typography variant='body2' gutterBottom>
							Для импорта используйте шаблон Excel с правильной структурой.
						</Typography>
						<Button
							size='small'
							onClick={handleDownloadTemplate}
							sx={{ mt: 1 }}
						>
							Скачать шаблон
						</Button>
					</Alert>
				)}
			</DialogContent>

			<DialogActions>
				<Button onClick={handleClose}>
					{result ? 'Закрыть' : 'Отмена'}
				</Button>
				{!result && (
					<Button
						variant='contained'
						onClick={handleImport}
						disabled={!file || importMutation.isPending}
					>
						{importMutation.isPending ? (
							<CircularProgress size={20} />
						) : (
							'Импортировать'
						)}
					</Button>
				)}
			</DialogActions>
		</Dialog>
	)
}
