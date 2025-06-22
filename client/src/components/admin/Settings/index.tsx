import React, { useState, useEffect } from 'react'
import {
	Box,
	Typography,
	Paper,
	Grid,
	Switch,
	TextField,
	FormControlLabel,
	Button,
	Accordion,
	AccordionSummary,
	AccordionDetails,
	Alert,
	Snackbar,
	Chip,
	IconButton,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import {
	settingsService,
	Setting,
	SettingUpdate,
} from '../../../services/settingsService'

interface CategorySettings {
	[key: string]: Setting[]
}

const categoryNames: { [key: string]: string } = {
	general: 'Общие',
	submissions: 'Заявки',
	forms: 'Формы',
	integrations: 'Интеграции',
	ui: 'Интерфейс',
}

const Settings: React.FC = () => {
	const [settings, setSettings] = useState<CategorySettings>({})
	const [loading, setLoading] = useState(true)
	const [snackbar, setSnackbar] = useState<{
		open: boolean
		message: string
		severity: 'success' | 'error'
	}>({
		open: false,
		message: '',
		severity: 'success',
	})
	const [editDialog, setEditDialog] = useState<{
		open: boolean
		setting: Setting | null
		isNew: boolean
	}>({
		open: false,
		setting: null,
		isNew: false,
	})
	const [editForm, setEditForm] = useState<{
		key: string
		value: any
		description: string
		category: string
		type: 'boolean' | 'string' | 'number' | 'object'
	}>({
		key: '',
		value: '',
		description: '',
		category: 'general',
		type: 'string',
	})

	const loadSettings = async () => {
		try {
			setLoading(true)
			const allSettings = await settingsService.getAllSettings()

			// Группируем настройки по категориям
			const grouped: CategorySettings = {}
			allSettings.forEach(setting => {
				if (!grouped[setting.category]) {
					grouped[setting.category] = []
				}
				grouped[setting.category].push(setting)
			})

			setSettings(grouped)
		} catch (error) {
			console.error('Ошибка загрузки настроек:', error)
			setSnackbar({
				open: true,
				message: 'Ошибка загрузки настроек',
				severity: 'error',
			})
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		loadSettings()
	}, [])

	const handleSettingChange = async (setting: Setting, newValue: any) => {
		try {
			await settingsService.updateSettingValue(setting.key, newValue)
			await loadSettings() // Перезагружаем настройки
			setSnackbar({
				open: true,
				message: 'Настройка обновлена',
				severity: 'success',
			})
		} catch (error) {
			console.error('Ошибка обновления настройки:', error)
			setSnackbar({
				open: true,
				message: 'Ошибка обновления настройки',
				severity: 'error',
			})
		}
	}

	const handleEditSetting = (setting: Setting) => {
		setEditForm({
			key: setting.key,
			value: setting.value,
			description: setting.description || '',
			category: setting.category,
			type: setting.type,
		})
		setEditDialog({
			open: true,
			setting,
			isNew: false,
		})
	}

	const handleNewSetting = () => {
		setEditForm({
			key: '',
			value: '',
			description: '',
			category: 'general',
			type: 'string',
		})
		setEditDialog({
			open: true,
			setting: null,
			isNew: true,
		})
	}

	const handleSaveEdit = async () => {
		try {
			const updateData: SettingUpdate = {
				value:
					editForm.type === 'number'
						? Number(editForm.value)
						: editForm.type === 'boolean'
						? Boolean(editForm.value)
						: editForm.type === 'object'
						? JSON.parse(editForm.value)
						: editForm.value,
				description: editForm.description,
				category: editForm.category,
				type: editForm.type,
			}

			await settingsService.updateSetting(editForm.key, updateData)
			await loadSettings()
			setEditDialog({ open: false, setting: null, isNew: false })
			setSnackbar({
				open: true,
				message: editDialog.isNew ? 'Настройка создана' : 'Настройка обновлена',
				severity: 'success',
			})
		} catch (error) {
			console.error('Ошибка сохранения настройки:', error)
			setSnackbar({
				open: true,
				message: 'Ошибка сохранения настройки',
				severity: 'error',
			})
		}
	}

	const handleDeleteSetting = async (setting: Setting) => {
		if (window.confirm(`Удалить настройку "${setting.key}"?`)) {
			try {
				await settingsService.deleteSetting(setting.key)
				await loadSettings()
				setSnackbar({
					open: true,
					message: 'Настройка удалена',
					severity: 'success',
				})
			} catch (error) {
				console.error('Ошибка удаления настройки:', error)
				setSnackbar({
					open: true,
					message: 'Ошибка удаления настройки',
					severity: 'error',
				})
			}
		}
	}

	const renderSettingInput = (setting: Setting) => {
		switch (setting.type) {
			case 'boolean':
				return (
					<FormControlLabel
						control={
							<Switch
								checked={Boolean(setting.value)}
								onChange={e => handleSettingChange(setting, e.target.checked)}
							/>
						}
						label={setting.description || setting.key}
					/>
				)
			case 'number':
				return (
					<TextField
						type='number'
						label={setting.description || setting.key}
						value={setting.value}
						onChange={e => handleSettingChange(setting, Number(e.target.value))}
						fullWidth
						size='small'
					/>
				)
			case 'object':
				return (
					<TextField
						label={setting.description || setting.key}
						value={JSON.stringify(setting.value, null, 2)}
						onChange={e => {
							try {
								const parsed = JSON.parse(e.target.value)
								handleSettingChange(setting, parsed)
							} catch (error) {
								// Игнорируем ошибки парсинга при вводе
							}
						}}
						multiline
						rows={4}
						fullWidth
						size='small'
					/>
				)
			default:
				return (
					<TextField
						label={setting.description || setting.key}
						value={setting.value}
						onChange={e => handleSettingChange(setting, e.target.value)}
						fullWidth
						size='small'
					/>
				)
		}
	}

	if (loading) {
		return (
			<Box sx={{ p: 3 }}>
				<Typography>Загрузка настроек...</Typography>
			</Box>
		)
	}

	return (
		<Box sx={{ p: 3 }}>
			<Box
				sx={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					mb: 3,
				}}
			>
				<Typography variant='h4' component='h1'>
					Настройки системы
				</Typography>
				<Button
					variant='contained'
					startIcon={<AddIcon />}
					onClick={handleNewSetting}
				>
					Добавить настройку
				</Button>
			</Box>

			{Object.entries(settings).map(([category, categorySettings]) => (
				<Accordion key={category} defaultExpanded>
					<AccordionSummary expandIcon={<ExpandMoreIcon />}>
						<Typography variant='h6'>
							{categoryNames[category] || category}
							<Chip
								label={categorySettings.length}
								size='small'
								sx={{ ml: 2 }}
							/>
						</Typography>
					</AccordionSummary>
					<AccordionDetails>
						<Box
							sx={{
								display: 'grid',
								gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
								gap: 3,
							}}
						>
							{categorySettings.map(setting => (
								<Paper key={setting._id} sx={{ p: 2 }}>
									<Box
										sx={{
											display: 'flex',
											justifyContent: 'space-between',
											alignItems: 'flex-start',
											mb: 2,
										}}
									>
										<Box>
											<Typography
												variant='subtitle2'
												sx={{ fontWeight: 'bold' }}
											>
												{setting.key}
											</Typography>
											<Chip
												label={setting.type}
												size='small'
												variant='outlined'
												sx={{ mt: 0.5 }}
											/>
										</Box>
										<Box>
											<IconButton
												size='small'
												onClick={() => handleEditSetting(setting)}
											>
												<EditIcon />
											</IconButton>
											<IconButton
												size='small'
												onClick={() => handleDeleteSetting(setting)}
												color='error'
											>
												<DeleteIcon />
											</IconButton>
										</Box>
									</Box>
									{renderSettingInput(setting)}
								</Paper>
							))}
						</Box>
					</AccordionDetails>
				</Accordion>
			))}

			{/* Диалог редактирования */}
			<Dialog
				open={editDialog.open}
				onClose={() =>
					setEditDialog({ open: false, setting: null, isNew: false })
				}
				maxWidth='sm'
				fullWidth
			>
				<DialogTitle>
					{editDialog.isNew ? 'Новая настройка' : 'Редактировать настройку'}
				</DialogTitle>
				<DialogContent>
					<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
						<TextField
							label='Ключ'
							value={editForm.key}
							onChange={e => setEditForm({ ...editForm, key: e.target.value })}
							fullWidth
							disabled={!editDialog.isNew}
						/>
						<Box sx={{ display: 'flex', gap: 2 }}>
							<TextField
								select
								label='Категория'
								value={editForm.category}
								onChange={e =>
									setEditForm({ ...editForm, category: e.target.value })
								}
								fullWidth
								SelectProps={{ native: true }}
							>
								{Object.entries(categoryNames).map(([key, name]) => (
									<option key={key} value={key}>
										{name}
									</option>
								))}
							</TextField>
							<TextField
								select
								label='Тип'
								value={editForm.type}
								onChange={e =>
									setEditForm({ ...editForm, type: e.target.value as any })
								}
								fullWidth
								SelectProps={{ native: true }}
							>
								<option value='string'>Строка</option>
								<option value='number'>Число</option>
								<option value='boolean'>Логический</option>
								<option value='object'>Объект</option>
							</TextField>
						</Box>
						<TextField
							label='Описание'
							value={editForm.description}
							onChange={e =>
								setEditForm({ ...editForm, description: e.target.value })
							}
							fullWidth
						/>
						<Box>
							{editForm.type === 'boolean' ? (
								<FormControlLabel
									control={
										<Switch
											checked={Boolean(editForm.value)}
											onChange={e =>
												setEditForm({ ...editForm, value: e.target.checked })
											}
										/>
									}
									label='Значение'
								/>
							) : editForm.type === 'object' ? (
								<TextField
									label='Значение (JSON)'
									value={
										typeof editForm.value === 'object'
											? JSON.stringify(editForm.value, null, 2)
											: editForm.value
									}
									onChange={e =>
										setEditForm({ ...editForm, value: e.target.value })
									}
									multiline
									rows={4}
									fullWidth
								/>
							) : (
								<TextField
									label='Значение'
									type={editForm.type === 'number' ? 'number' : 'text'}
									value={editForm.value}
									onChange={e =>
										setEditForm({ ...editForm, value: e.target.value })
									}
									fullWidth
								/>
							)}
						</Box>
					</Box>
				</DialogContent>
				<DialogActions>
					<Button
						onClick={() =>
							setEditDialog({ open: false, setting: null, isNew: false })
						}
					>
						Отмена
					</Button>
					<Button onClick={handleSaveEdit} variant='contained'>
						Сохранить
					</Button>
				</DialogActions>
			</Dialog>

			{/* Snackbar для уведомлений */}
			<Snackbar
				open={snackbar.open}
				autoHideDuration={6000}
				onClose={() => setSnackbar({ ...snackbar, open: false })}
			>
				<Alert
					onClose={() => setSnackbar({ ...snackbar, open: false })}
					severity={snackbar.severity}
					sx={{ width: '100%' }}
				>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</Box>
	)
}

export default Settings
