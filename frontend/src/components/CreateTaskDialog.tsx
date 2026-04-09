import React, { useState, useEffect } from 'react'
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Grid,
	TextField,
	Autocomplete,
	CircularProgress,
	Typography,
	Box,
	IconButton,
	FormControlLabel,
	Checkbox,
} from '@mui/material'
import { Task, taskService } from '../services/taskService'
import { useAuth } from '../context/AuthContext'
import { Close } from '@mui/icons-material'

interface ManagerOption {
	id: string
	name: string
}

interface CreateTaskDialogProps {
	open: boolean
	visitId: number | null
	bitrixId: number | null
	visitDate?: string
	managers: ManagerOption[]
	onClose: () => void
	onSave: (data: Task) => void
}

export const CreateTaskDialog: React.FC<CreateTaskDialogProps> = ({
	open,
	visitId,
	bitrixId,
	visitDate,
	managers: initialManagers,
	onClose,
	onSave,
}) => {
	const [manager, setManager] = useState<ManagerOption | null>(null)
	const [description, setDescription] = useState<string>('')
	const [title, setTitle] = useState<string>('')
	const [deadline, setDeadline] = useState<string>('')
	const [managers, setManagers] = useState<ManagerOption[]>(initialManagers)
	const [managerSearch, setManagerSearch] = useState<string>('')
	const [isLoadingManagers, setIsLoadingManagers] = useState(false)
	const [file, setFile] = useState<File | null>(null)
	const [files, setFiles] = useState<File[]>([])
	const { user } = useAuth()
	const [isSaving, setIsSaving] = useState(false)
	const [isOrder, setIsOrder] = useState(false)


	const removeFile = (index: number) => {
		setFiles(prev => prev.filter((_, i) => i !== index))
	}
	// Загружаем менеджеров при вводе в поиск
	useEffect(() => {
		const loadManagers = async () => {
			setIsLoadingManagers(true)
			try {
				const data = await taskService.getManagers(managerSearch || undefined)
				console.log('API response:', data)

				// Гибкая обработка: если data — массив, используем его напрямую
				let managersList: any[] = []
				if (Array.isArray(data)) {
					managersList = data
				} else if (data && typeof data === 'object' && Array.isArray(data.result)) {
					managersList = data.result
				} else {
					console.warn('Unexpected API response format')
					managersList = []
				}

				const adaptedManagers = managersList.map(manager => ({
					id: manager.ID,
					name: [manager.LAST_NAME, manager.NAME, manager.SECOND_NAME]
						.filter(Boolean)
						.join(' '),
				}))

				console.log('Final managers to set:', adaptedManagers)
				setManagers(adaptedManagers)
			} catch (err) {
				console.error('Ошибка загрузки менеджеров:', err)
				setManagers([])
			} finally {
				setIsLoadingManagers(false)
			}
		}

		const timeoutId = setTimeout(loadManagers, 300)
		return () => clearTimeout(timeoutId)
	}, [managerSearch])

	useEffect(() => {
		if (open) {
			// Сбрасываем всё при открытии
			setManager(null)
			setDescription('')
			setTitle('')
			setFile(null)
			setIsOrder(false)
			setFiles([])
			setDeadline('')
			setManagerSearch('')
		}
	}, [open])

	// Загружаем менеджеров при открытии диалога 
	useEffect(() => {
		if (open && managers.length === 0) {
			const loadInitialManagers = async () => {
				setIsLoadingManagers(true)
				try {
					const data = await taskService.getManagers()
					const managersList = data?.result || []
					const adaptedManagers = managersList.map(
						(manager: {
							ID: string
							LAST_NAME: string
							NAME: string
							SECOND_NAME: string
						}) => ({
							id: manager.ID,
							name: [manager.LAST_NAME, manager.NAME, manager.SECOND_NAME]
								.filter(Boolean)
								.join(' '),
						})
					)
					setManagers(adaptedManagers)
				} catch (err) {
					console.error('Ошибка загрузки начального списка менеджеров:', err)
				} finally {
					setIsLoadingManagers(false)
				}
			}
			loadInitialManagers()
		}
	}, [open, managers.length])

	const handleClose = () => {
		setManager(null)
		setDescription('')
		setTitle('')
		setFile(null)
		setDeadline('')
		setManagerSearch('')
		setIsSaving(false)
		setIsOrder(false)
		onClose()
	}

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFiles = Array.from(e.target.files || [])
		setFiles(prev => [...prev, ...selectedFiles])
	}

	const handleSave = async () => {
		if (!manager || !title.trim() || isSaving) {
			return
		}

		setIsSaving(true)

		const taskData = {
			title: title.trim(),
			responsible_id: Number(manager.id),
			description: description,
			client_info: user?.email || '',
			company_bitrix_id: bitrixId || 0,
			visit_id: visitId || null,
			deadline: deadline || undefined,
			files: files,
			tags: isOrder ? ['zakaz'] : [],
		}

		try {
			await onSave(taskData)

		} catch (err) {
			console.error('Ошибка при сохранении задачи:', err)
		} finally {
			setIsSaving(false)
		}
	}
	return (
		<Dialog
			open={open}
			onClose={handleClose}
			maxWidth='sm'
			fullWidth
			PaperProps={{
				sx: {
					borderRadius: 2,
					boxShadow: 4,
				},
			}}
		>
			<DialogTitle sx={{ fontWeight: 600 }}>
				Создать задачу менеджеру
			</DialogTitle>

			<DialogContent>
				<Grid container spacing={2} sx={{ mt: 1 }}>
					{/* ID визита 
                    <Grid item xs={12}>
                        <TextField
                            label="ID визита"
                            value={visitId || ''}
                            fullWidth
                            InputProps={{ readOnly: true }}
                            variant="outlined"
                            size="small"
                        />
                    </Grid>

                    {/* Дата визита 
                    <Grid item xs={12}>
                        <TextField
                            label="Дата визита"
                            type="datetime-local"
                            value={visitDate ? new Date(visitDate).toISOString().slice(0, 16) : ''}
                            fullWidth
                            InputProps={{ readOnly: true }}
                            variant="outlined"
                            size="small"
                        />
                    </Grid>
                    */}

					{/* Название задачи — новое поле */}
					<Grid item xs={12}>
						<TextField
							label='Название задачи'
							value={title}
							onChange={e => setTitle(e.target.value)}
							fullWidth
							required
							variant='outlined'
							size='small'
							placeholder='Введите название задачи'
						/>
					</Grid>

					{/* Ответственный менеджер */}
					<Grid item xs={12}>
						<Autocomplete
							options={managers}
							getOptionLabel={(option) => option?.name || ''}
							isOptionEqualToValue={(option, value) => option?.id === value?.id}
							value={manager}
							onChange={(_, newValue) => {
								setManager(newValue)
								// Не нужно сбрасывать managerSearch здесь — Autocomplete сам очистит поле
							}}
							onInputChange={(_, newInputValue, reason) => {
								if (reason === 'input') {
									setManagerSearch(newInputValue)
								}
								// При reason === 'reset' или 'clear' — НЕ обновляем managerSearch
							}}
							loading={isLoadingManagers}
							renderInput={(params) => (
								<TextField
									{...params}
									label="Ответственный менеджер"
									variant="outlined"
									size="small"
									required
									placeholder="Начните вводить имя"
									InputProps={{
										...params.InputProps,
										endAdornment: (
											<>
												{isLoadingManagers ? (
													<CircularProgress color="inherit" size={20} />
												) : null}
												{params.InputProps.endAdornment}
											</>
										),
									}}
								/>
							)}
							noOptionsText="Не найдено"
						/>
					</Grid>

					{/* Крайний срок */}
					<Grid item xs={12}>
						<TextField
							label='Крайний срок'
							type='datetime-local'
							value={deadline}
							onChange={e => setDeadline(e.target.value)}
							fullWidth
							variant='outlined'
							size='small'
							InputLabelProps={{
								shrink: true,
							}}
						/>

					</Grid>

					<Grid item xs={12}>
						<Button
							variant="outlined"
							size="small"
							onClick={() => document.getElementById('task-file-input')?.click()}
							fullWidth
						>
							Прикрепить файл(ы)
						</Button>
						<input
							id="task-file-input"
							type="file"
							multiple
							accept="*"
							onChange={handleFileChange}
							style={{ display: 'none' }}
						/>

						{files.length > 0 && (
							<Box sx={{ mt: 1 }}>
								<Typography variant="body2" color="text.secondary" gutterBottom>
									Выбранные файлы:
								</Typography>
								{files.map((file, index) => (
									<Box
										key={index}
										sx={{
											display: 'flex',
											justifyContent: 'space-between',
											alignItems: 'center',
											mb: 0.5,
											p: 0.5,
											borderRadius: 1,
										}}
									>
										<Typography variant="body2" noWrap>
											{file.name}
										</Typography>
										<IconButton size="small" onClick={() => removeFile(index)}>
											<Close fontSize="small" />
										</IconButton>
									</Box>
								))}
							</Box>
						)}
					</Grid>

					{/* Комментарий */}
					<Grid item xs={12}>
						<TextField
							label='Комментарий'
							multiline
							rows={4}
							value={description}
							onChange={e => setDescription(e.target.value)}
							fullWidth
							variant='outlined'
							size='small'
						/>
					</Grid>

					<Grid item xs={12}>
						<FormControlLabel
							control={
								<Checkbox
									checked={isOrder}
									onChange={(e) => setIsOrder(e.target.checked)}
									color="primary"
								/>
							}
							label="Заказ"
						/>
					</Grid>

				</Grid>
			</DialogContent>

			<DialogActions sx={{ p: 2, pt: 0 }}>
				<Button onClick={handleClose} color='inherit' variant='outlined'>
					Отмена
				</Button>
				<Button
					onClick={handleSave}
					variant='contained'
					color='primary'
					disabled={!manager || !title.trim() || isSaving}
				>
					{isSaving ? <CircularProgress size={20} color="inherit" /> : 'Сохранить'}
				</Button>
			</DialogActions>
		</Dialog>
	)
}
