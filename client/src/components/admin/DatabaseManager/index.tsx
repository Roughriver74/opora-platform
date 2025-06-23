import React, { useState, useMemo } from 'react'
import {
	Box,
	Tabs,
	Tab,
	Typography,
	Paper,
	Button,
	Stack,
	Alert,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	CircularProgress,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Chip,
} from '@mui/material'
import { Build as NormalizeIcon } from '@mui/icons-material'
import { DatabaseTable } from './components/DatabaseTable'
import { useFormFields } from './hooks/useFormFields'
import { useUsers } from './hooks/useUsers'
// import { getFieldSectionName } from './utils/sectionUtils' // Больше не нужно
import {
	calculateNormalizedOrder,
	generateNormalizationReport,
	NormalizationResult,
} from './utils/orderNormalizer'

interface TabPanelProps {
	children?: React.ReactNode
	index: number
	value: number
}

const TabPanel = (props: TabPanelProps) => {
	const { children, value, index, ...other } = props

	return (
		<div
			role='tabpanel'
			hidden={value !== index}
			id={`database-tabpanel-${index}`}
			aria-labelledby={`database-tab-${index}`}
			{...other}
		>
			{value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
		</div>
	)
}

const a11yProps = (index: number) => {
	return {
		id: `database-tab-${index}`,
		'aria-controls': `database-tabpanel-${index}`,
	}
}

// Конфигурация колонок для таблицы пользователей
const usersColumns = [
	{
		accessorKey: 'firstName',
		header: 'Имя',
		size: 150,
	},
	{
		accessorKey: 'lastName',
		header: 'Фамилия',
		size: 150,
	},
	{
		accessorKey: 'email',
		header: 'Email',
		size: 250,
	},
	{
		accessorKey: 'role',
		header: 'Роль',
		size: 120,
	},
	{
		accessorKey: 'bitrix_id',
		header: 'Битрикс ID',
		size: 120,
	},
]

const DatabaseManager: React.FC = () => {
	const [tabValue, setTabValue] = useState(0)
	const [normalizeDialogOpen, setNormalizeDialogOpen] = useState(false)
	const [normalizationResult, setNormalizationResult] =
		useState<NormalizationResult | null>(null)
	const [isNormalizing, setIsNormalizing] = useState(false)
	const [successMessage, setSuccessMessage] = useState<string | null>(null)
	const [selectedFormId, setSelectedFormId] = useState<string>('all')

	// Хуки для загрузки данных
	const {
		data: formFieldsData,
		isLoading: formFieldsLoading,
		updateField,
		error: formFieldsError,
	} = useFormFields()

	const {
		data: usersData,
		isLoading: usersLoading,
		updateUser,
		error: usersError,
	} = useUsers()

	// Получаем уникальные формы для фильтра
	const uniqueForms = useMemo(() => {
		if (!formFieldsData) return []

		const formIds = formFieldsData
			.map(field => field.formId)
			.filter(Boolean)
			.filter((formId, index, array) => array.indexOf(formId) === index) // уникальные значения

		return formIds.map(formId => ({
			id: formId!,
			name: `Форма ${formId}`,
		}))
	}, [formFieldsData])

	// Фильтрованные данные полей формы
	const filteredFormFields = useMemo(() => {
		if (!formFieldsData) return []
		if (selectedFormId === 'all') return formFieldsData

		return formFieldsData.filter(field => field.formId === selectedFormId)
	}, [formFieldsData, selectedFormId])

	// Динамическая конфигурация колонок для таблицы полей формы
	const formFieldsColumns = useMemo(
		() => [
			{
				accessorKey: 'name',
				header: 'Название поля',
				size: 180,
			},
			{
				accessorKey: 'label',
				header: 'Отображаемое название',
				size: 180,
			},
			{
				accessorKey: 'type',
				header: 'Тип',
				size: 100,
			},
			{
				accessorKey: 'order',
				header: 'Порядок',
				size: 80,
			},
			{
				accessorKey: 'formId',
				header: 'ID Формы',
				size: 120,
				cell: (props: any) => {
					const formId = props.getValue?.()
					return formId ? (
						<Chip label={formId} variant='outlined' size='small' />
					) : (
						<Chip
							label='Не указана'
							variant='outlined'
							size='small'
							color='error'
						/>
					)
				},
			},
			{
				accessorKey: 'section',
				header: 'Раздел',
				size: 200,
				enableSorting: false,
				cell: (props: any) => {
					const field = props.row?.original

					if (!field) {
						return 'Ошибка'
					}

					// Если это сам раздел (header), показываем специальное обозначение
					if (field.type === 'header') {
						return (
							<Box sx={{ fontWeight: 'bold', color: 'primary.main' }}>
								🏷️ РАЗДЕЛ: {field.label || 'Без названия'}
							</Box>
						)
					}

					// Если это разделитель
					if (field.type === 'divider') {
						return (
							<Box sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
								➖ РАЗДЕЛИТЕЛЬ
							</Box>
						)
					}

					// Получаем все разделы для выпадающего списка
					const sections = (formFieldsData || [])
						.filter(f => f.type === 'header')
						.sort((a, b) => (a.order || 0) - (b.order || 0))

					// Определяем текущий раздел
					let currentSectionText = 'Без раздела'
					if (field.sectionId) {
						const currentSection = sections.find(s => s._id === field.sectionId)
						if (currentSection) {
							currentSectionText = currentSection.label || 'Без названия'
						}
					}

					// Для обычных полей показываем выпадающий список
					return (
						<FormControl size='small' fullWidth>
							<Select
								value={field.sectionId || ''}
								onChange={e => {
									const newSectionId = e.target.value || null
									if (updateField) {
										updateField(field._id, { sectionId: newSectionId })
									}
								}}
								displayEmpty
								variant='standard'
								sx={{
									minWidth: 150,
									'& .MuiSelect-select': {
										fontSize: '0.875rem',
									},
								}}
							>
								<MenuItem value=''>
									<em style={{ color: '#666' }}>Без раздела</em>
								</MenuItem>
								{sections.map(section => (
									<MenuItem key={section._id} value={section._id}>
										🏷️ {section.label || 'Без названия'}
									</MenuItem>
								))}
							</Select>
						</FormControl>
					)
				},
			},
			{
				accessorKey: 'required',
				header: 'Обязательное',
				size: 100,
				cell: (props: any) => {
					const value = props.getValue?.()
					return value ? 'Да' : 'Нет'
				},
			},
			{
				accessorKey: 'sectionId',
				header: 'ID Раздела',
				size: 140,
				cell: (props: any) => {
					const sectionId = props.getValue?.()
					return sectionId ? (
						<Chip label={sectionId} variant='outlined' size='small' />
					) : (
						<Chip label='Авто' variant='outlined' size='small' color='info' />
					)
				},
			},
			{
				accessorKey: 'bitrixFieldId',
				header: 'Битрикс ID',
				size: 140,
			},
		],
		[formFieldsData]
	)

	const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
		setTabValue(newValue)
		setSuccessMessage(null) // Сбрасываем сообщение при смене вкладки
	}

	// Обработчик предварительного просмотра нормализации
	const handleNormalizePreview = () => {
		if (!filteredFormFields) return

		const result = calculateNormalizedOrder(filteredFormFields)
		setNormalizationResult(result)
		setNormalizeDialogOpen(true)
	}

	// Обработчик применения нормализации
	const handleApplyNormalization = async () => {
		if (!normalizationResult || !updateField) return

		setIsNormalizing(true)
		try {
			// Применяем все обновления по очереди
			for (const update of normalizationResult.updates) {
				await updateField(update.id, { order: update.newOrder })
			}

			setSuccessMessage(
				`✅ Нормализация завершена! Обновлено ${normalizationResult.summary.totalChanges} полей.`
			)
			setNormalizeDialogOpen(false)
			setNormalizationResult(null)
		} catch (error: any) {
			console.error('Ошибка при нормализации:', error)
			alert(`Ошибка при нормализации: ${error.message}`)
		} finally {
			setIsNormalizing(false)
		}
	}

	// Закрытие диалога нормализации
	const handleCloseNormalizeDialog = () => {
		setNormalizeDialogOpen(false)
		setNormalizationResult(null)
	}

	return (
		<Box>
			<Typography variant='h5' component='h2' gutterBottom>
				Управление базой данных
			</Typography>
			<Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
				Редактируйте данные напрямую в таблицах с автоматическим сохранением
			</Typography>

			<Alert severity='info' sx={{ mb: 3 }}>
				💡 Дважды кликните на ячейку для редактирования. Изменения сохраняются
				автоматически при нажатии Enter или потере фокуса.
			</Alert>

			<Paper elevation={1}>
				<Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
					<Tabs
						value={tabValue}
						onChange={handleTabChange}
						aria-label='database tables tabs'
						variant='scrollable'
						scrollButtons='auto'
					>
						<Tab label='Поля форм' {...a11yProps(0)} />
						<Tab label='Пользователи' {...a11yProps(1)} />
						<Tab label='Формы' {...a11yProps(2)} />
						<Tab label='Заявки' {...a11yProps(3)} />
						<Tab label='Настройки' {...a11yProps(4)} />
					</Tabs>
				</Box>

				<TabPanel value={tabValue} index={0}>
					<Stack spacing={2}>
						{/* Сообщение об успехе */}
						{successMessage && (
							<Alert severity='success' onClose={() => setSuccessMessage(null)}>
								{successMessage}
							</Alert>
						)}

						{/* Ошибки */}
						{formFieldsError && (
							<Alert severity='error'>
								Ошибка загрузки полей: {formFieldsError}
							</Alert>
						)}

						{/* Панель управления */}
						<Stack
							direction='row'
							spacing={2}
							alignItems='center'
							flexWrap='wrap'
						>
							<Typography variant='h6' component='h3'>
								Поля формы
							</Typography>

							{/* Фильтр по формам */}
							<FormControl size='small' sx={{ minWidth: 200 }}>
								<InputLabel>Фильтр по форме</InputLabel>
								<Select
									value={selectedFormId}
									onChange={e => setSelectedFormId(e.target.value)}
									label='Фильтр по форме'
								>
									<MenuItem value='all'>
										<em>Все формы ({formFieldsData?.length || 0} полей)</em>
									</MenuItem>
									{uniqueForms.map(form => {
										const fieldsCount =
											formFieldsData?.filter(f => f.formId === form.id)
												.length || 0
										return (
											<MenuItem key={form.id} value={form.id}>
												{form.name} ({fieldsCount} полей)
											</MenuItem>
										)
									})}
								</Select>
							</FormControl>

							<Button
								variant='outlined'
								size='small'
								startIcon={<NormalizeIcon />}
								onClick={handleNormalizePreview}
								disabled={formFieldsLoading || !filteredFormFields.length}
							>
								Нормализовать порядок
							</Button>
						</Stack>

						{/* Информационная панель */}
						<Paper
							sx={{ p: 2, bgcolor: 'info.light', color: 'info.contrastText' }}
						>
							<Typography variant='body2'>
								<strong>📋 Правила нумерации:</strong>
								<br />
								• Разделы (заголовки): 100, 200, 300...
								<br />
								• Поля в разделах: 101, 102, 103... (для раздела 100)
								<br />
								• Поля без раздела: 1, 2, 3...
								<br />• Используйте кнопку "Нормализовать порядок" для
								автоматического исправления
							</Typography>
						</Paper>

						{/* Таблица */}
						<DatabaseTable
							data={filteredFormFields}
							columns={formFieldsColumns}
							isLoading={formFieldsLoading}
							onUpdateRow={updateField}
							tableName={`Поля форм${
								selectedFormId !== 'all' ? ` (форма ${selectedFormId})` : ''
							}`}
						/>
					</Stack>
				</TabPanel>

				<TabPanel value={tabValue} index={1}>
					{usersError && (
						<Typography color='error' sx={{ mb: 2 }}>
							Ошибка загрузки пользователей: {usersError}
						</Typography>
					)}
					<DatabaseTable
						data={usersData || []}
						columns={usersColumns}
						isLoading={usersLoading}
						onUpdateRow={updateUser}
						tableName='Пользователи'
					/>
				</TabPanel>

				<TabPanel value={tabValue} index={2}>
					<Box sx={{ p: 3, textAlign: 'center' }}>
						<Typography color='text.secondary'>
							Таблица форм - в разработке
						</Typography>
					</Box>
				</TabPanel>

				<TabPanel value={tabValue} index={3}>
					<Box sx={{ p: 3, textAlign: 'center' }}>
						<Typography color='text.secondary'>
							Таблица заявок - в разработке
						</Typography>
					</Box>
				</TabPanel>

				<TabPanel value={tabValue} index={4}>
					<Box sx={{ p: 3, textAlign: 'center' }}>
						<Typography color='text.secondary'>
							Таблица настроек - в разработке
						</Typography>
					</Box>
				</TabPanel>
			</Paper>

			{/* Диалог нормализации порядка */}
			<Dialog
				open={normalizeDialogOpen}
				onClose={handleCloseNormalizeDialog}
				maxWidth='md'
				fullWidth
			>
				<DialogTitle>🔧 Нормализация порядка полей</DialogTitle>
				<DialogContent>
					{normalizationResult && (
						<Box
							sx={{
								whiteSpace: 'pre-line',
								fontFamily: 'monospace',
								fontSize: '0.9rem',
							}}
						>
							{generateNormalizationReport(normalizationResult)}
						</Box>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCloseNormalizeDialog}>Отмена</Button>
					<Button
						onClick={handleApplyNormalization}
						variant='contained'
						disabled={
							isNormalizing ||
							!normalizationResult ||
							normalizationResult.summary.totalChanges === 0
						}
						startIcon={
							isNormalizing ? <CircularProgress size={16} /> : undefined
						}
					>
						{isNormalizing ? 'Применяется...' : 'Применить изменения'}
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	)
}

export default DatabaseManager
