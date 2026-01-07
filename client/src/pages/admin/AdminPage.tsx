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
	Paper,
	Stack,
	Avatar,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import DashboardIcon from '@mui/icons-material/Dashboard'
import LogoutIcon from '@mui/icons-material/Logout'
import FormsList from '../../components/admin/FormsList'
import FormEditor from '../../components/admin/FormEditor'
import BitrixIntegration from '../../components/admin/BitrixIntegration'
import Settings from '../../components/admin/Settings'
import { SimpleDatabase } from '../../components/admin/SimpleDatabase'
import { useNavigate } from 'react-router-dom'
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
			{value === index && <Box sx={{ pt: { xs: 2, md: 3 } }}>{children}</Box>}
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
	const [loadingForm, setLoadingForm] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const { user, logout } = useAuth()
	const navigate = useNavigate()
	const displayName =
		user?.firstName || user?.fullName || user?.email || 'Администратор'
	const initials =
		displayName
			.split(' ')
			.filter(Boolean)
			.map(part => part[0])
			.slice(0, 2)
			.join('')
			.toUpperCase() || 'A'

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
		// Сбрасываем текущую форму при уходе с вкладки редактирования
		if (newValue !== 1) {
			setCurrentForm(undefined)
		}
	}

	// Обработчик добавления новой формы
	const handleAddForm = () => {
		setCurrentForm(undefined) // Сбрасываем текущую форму
		setTabValue(1) // Переключаемся на вкладку редактирования
	}

	// Обработчик редактирования формы
	const handleEditForm = async (id: string) => {
		setLoadingForm(true)
		try {
			// Загружаем полную информацию о форме, включая поля
			const fullForm = await FormService.getFormById(id)
			setCurrentForm(fullForm)
			setTabValue(1) // Переключаемся на вкладку редактирования
		} catch (err: any) {
			setError(`Ошибка при загрузке формы: ${err.message}`)
		} finally {
			setLoadingForm(false)
		}
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
		<Container maxWidth='xl' sx={{ mt: { xs: 3, md: 4 }, mb: 6 }}>
			<Paper
				elevation={0}
				sx={{
					p: { xs: 2, md: 3 },
					mb: 3,
					borderRadius: 3,
					border: '1px solid',
					borderColor: 'divider',
					background: theme =>
						`linear-gradient(135deg, ${alpha(
							theme.palette.primary.main,
							0.12
						)}, ${alpha(theme.palette.primary.main, 0.02)})`,
				}}
			>
				<Stack
					direction={{ xs: 'column', lg: 'row' }}
					spacing={3}
					alignItems={{ lg: 'center' }}
					justifyContent='space-between'
				>
					<Box>
						<Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 1 }}>
							<AdminPanelSettingsIcon sx={{ color: 'primary.main' }} />
							<Typography
								variant='overline'
								color='text.secondary'
								sx={{ letterSpacing: '0.08em' }}
							>
								Админ-панель
							</Typography>
						</Stack>
						<Typography
							variant='h4'
							component='h1'
							gutterBottom
							sx={{ fontWeight: 700 }}
						>
							Администрирование
						</Typography>
						<Typography variant='body1' color='text.secondary'>
							Управление формами и интеграцией с Битрикс24
						</Typography>
					</Box>
					<Stack
						direction={{ xs: 'column', sm: 'row' }}
						spacing={2}
						alignItems={{ xs: 'flex-start', sm: 'center' }}
					>
						<Stack
							direction='row'
							spacing={1.5}
							alignItems='center'
							sx={{
								pr: { sm: 2 },
								mr: { sm: 1 },
								borderRight: { sm: '1px solid' },
								borderColor: 'divider',
							}}
						>
							<Avatar
								sx={{
									width: 40,
									height: 40,
									bgcolor: 'primary.main',
									color: 'primary.contrastText',
									fontWeight: 600,
								}}
							>
								{initials}
							</Avatar>
							<Box>
								<Typography variant='caption' color='text.secondary'>
									Добро пожаловать
								</Typography>
								<Typography variant='subtitle2'>{displayName}</Typography>
							</Box>
						</Stack>
						<Stack direction='row' spacing={1.5} flexWrap='wrap'>
							<Button
								variant='contained'
								color='primary'
								startIcon={<DashboardIcon />}
								onClick={() => navigate('/dashboard')}
								sx={{
									textTransform: 'none',
									boxShadow: 'none',
									'&:hover': { boxShadow: 'none' },
								}}
							>
								Дашборд
							</Button>
							<Button
								variant='outlined'
								color='secondary'
								startIcon={<LogoutIcon />}
								onClick={logout}
								sx={{ textTransform: 'none' }}
							>
								Выйти
							</Button>
						</Stack>
					</Stack>
				</Stack>
			</Paper>

			<Paper
				elevation={0}
				sx={{
					mb: 3,
					borderRadius: 3,
					border: '1px solid',
					borderColor: 'divider',
					overflow: 'hidden',
				}}
			>
				<Tabs
					value={tabValue}
					onChange={handleTabChange}
					aria-label='admin tabs'
					variant='scrollable'
					scrollButtons='auto'
					textColor='primary'
					indicatorColor='primary'
					sx={{
						px: { xs: 1, md: 2 },
						minHeight: 52,
						'& .MuiTabs-indicator': {
							height: 3,
							borderRadius: 2,
						},
						'& .MuiTab-root': {
							textTransform: 'none',
							fontWeight: 600,
							minHeight: 52,
							px: 2,
						},
					}}
				>
					<Tab label='Формы' {...a11yProps(0)} />
					<Tab
						label={currentForm ? 'Редактирование формы' : 'Новая форма'}
						{...a11yProps(1)}
					/>
					<Tab label='База данных' {...a11yProps(2)} />
					<Tab label='Битрикс24' {...a11yProps(3)} />
					<Tab label='Настройки' {...a11yProps(4)} />
				</Tabs>
			</Paper>

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
				{loadingForm ? (
					<Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
						<CircularProgress />
					</Box>
				) : (
					<FormEditor
						form={currentForm}
						onSave={handleSaveForm}
						onBack={() => setTabValue(0)}
					/>
				)}
			</TabPanel>

			<TabPanel value={tabValue} index={2}>
				<SimpleDatabase forms={forms} formsLoading={loading} />
			</TabPanel>

			<TabPanel value={tabValue} index={3}>
				<BitrixIntegration />
			</TabPanel>

			<TabPanel value={tabValue} index={4}>
				<Settings />
			</TabPanel>
		</Container>
	)
}

export default AdminPage
