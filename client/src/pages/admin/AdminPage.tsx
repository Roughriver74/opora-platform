import React, { useState, useEffect } from 'react'
import {
	Container,
	Typography,
	Box,
	Tabs,
	Tab,
	CircularProgress,
	Alert,
	Button,
} from '@mui/material'
import FormsList from '../../components/admin/FormsList'
import FormEditor from '../../components/admin/FormEditor'
import BitrixIntegration from '../../components/admin/BitrixIntegration'
import BackupManagement from '../../components/admin/BackupManagement'
import Settings from '../../components/admin/Settings'
import { SimpleDatabase } from '../../components/admin/SimpleDatabase'
import { Form } from '../../types'
import { FormService } from '../../services/formService'
import { useAuth } from '../../contexts/auth'

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
			id={`simple-tabpanel-${index}`}
			aria-labelledby={`simple-tab-${index}`}
			{...other}
		>
			{value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
		</div>
	)
}

const a11yProps = (index: number) => {
	return {
		id: `simple-tab-${index}`,
		'aria-controls': `simple-tabpanel-${index}`,
	}
}

const AdminPage: React.FC = () => {
	const [tabValue, setTabValue] = useState(0)
	const [forms, setForms] = useState<Form[]>([])
	const [currentForm, setCurrentForm] = useState<Form | undefined>(undefined)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const { user, logout } = useAuth()

	// Загрузка всех форм
	const loadForms = async () => {
		setLoading(true)
		try {
			const response = await FormService.getAllForms()
			setForms(response)
			setError(null)
		} catch (err: any) {
			setError(`Ошибка при загрузке форм: ${err.message}`)
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		loadForms()
	}, [])

	// Обработчик изменения вкладки
	const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
		setTabValue(newValue)
	}

	// Обработчик добавления новой формы
	const handleAddForm = () => {
		setCurrentForm(undefined) // Сбрасываем текущую форму
		setTabValue(1) // Переключаемся на вкладку редактирования
	}

	// Обработчик редактирования формы
	const handleEditForm = (id: string) => {
		const form = forms.find(f => f._id === id)
		setCurrentForm(form)
		setTabValue(1) // Переключаемся на вкладку редактирования
	}

	// Обработчик удаления формы
	const handleDeleteForm = async (id: string) => {
		if (window.confirm('Вы уверены, что хотите удалить эту форму?')) {
			try {
				await FormService.deleteForm(id)
				// Обновляем список форм
				await loadForms()
			} catch (err: any) {
				setError(`Ошибка при удалении формы: ${err.message}`)
			}
		}
	}

	// Обработчик просмотра формы
	const handleViewForm = (id: string) => {
		window.open(`/?formId=${id}`, '_blank')
	}

	// Обработчик сохранения формы
	const handleSaveForm = async (savedForm: Form) => {
		// Обновляем список форм
		await loadForms()
		// Возвращаемся к списку форм
		setTabValue(0)
	}

	return (
		<Container maxWidth='lg' sx={{ mt: 4 }}>
			<Box
				sx={{
					mb: 4,
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
				}}
			>
				<div>
					<Typography variant='h4' component='h1' gutterBottom>
						Администрирование
					</Typography>
					<Typography variant='subtitle1' color='text.secondary'>
						Управление формами и интеграцией с Битрикс24
					</Typography>
				</div>
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
					<Typography variant='body2' color='text.secondary'>
						Добро пожаловать,{' '}
						{user?.firstName || user?.fullName || 'Администратор'}
					</Typography>
					<Button variant='outlined' color='secondary' onClick={logout}>
						Выйти
					</Button>
				</Box>
			</Box>

			<Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
				<Tabs
					value={tabValue}
					onChange={handleTabChange}
					aria-label='admin tabs'
					variant='scrollable'
					scrollButtons='auto'
				>
					<Tab label='Формы' {...a11yProps(0)} />
					<Tab
						label={currentForm ? 'Редактирование формы' : 'Новая форма'}
						{...a11yProps(1)}
					/>
					<Tab label='База данных' {...a11yProps(2)} />
					<Tab label='Битрикс24' {...a11yProps(3)} />
					<Tab label='Резервные копии' {...a11yProps(4)} />
					<Tab label='Настройки' {...a11yProps(5)} />
				</Tabs>
			</Box>

			<TabPanel value={tabValue} index={0}>
				{loading ? (
					<Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
						<CircularProgress />
					</Box>
				) : error ? (
					<Alert severity='error' sx={{ mb: 4 }}>
						{error}
					</Alert>
				) : (
					<FormsList
						forms={forms}
						onAddForm={handleAddForm}
						onEditForm={handleEditForm}
						onDeleteForm={handleDeleteForm}
						onViewForm={handleViewForm}
					/>
				)}
			</TabPanel>

			<TabPanel value={tabValue} index={1}>
				<FormEditor
					form={currentForm}
					onSave={handleSaveForm}
					onBack={() => setTabValue(0)}
				/>
			</TabPanel>

			<TabPanel value={tabValue} index={2}>
				<SimpleDatabase />
			</TabPanel>

			<TabPanel value={tabValue} index={3}>
				<BitrixIntegration />
			</TabPanel>

			<TabPanel value={tabValue} index={4}>
				<BackupManagement />
			</TabPanel>

			<TabPanel value={tabValue} index={5}>
				<Settings />
			</TabPanel>
		</Container>
	)
}

export default AdminPage
