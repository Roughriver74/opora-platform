import React, { useEffect, useMemo, useState } from 'react'
import {
	Box,
	Paper,
	Typography,
	Alert,
	CircularProgress,
	Button,
	Stack,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Chip,
	Tabs,
	Tab,
} from '@mui/material'
import { Refresh } from '@mui/icons-material'
import StorageIcon from '@mui/icons-material/Storage'
import ListAltIcon from '@mui/icons-material/ListAlt'
import PeopleIcon from '@mui/icons-material/People'
import { FieldsTable } from './components/FieldsTable'
import { SubmissionsTable } from './components/SubmissionsTable'
import { UsersTable } from './components/UsersTable'
import { useSimpleFields } from './hooks/useSimpleFields'
import { Form, FormField } from '../../../types'

interface SimpleDatabaseProps {
	forms: Form[]
	formsLoading?: boolean
}

interface TabPanelProps {
	children?: React.ReactNode
	index: number
	value: number
}

const TabPanel = ({ children, value, index }: TabPanelProps) => (
	<div role='tabpanel' hidden={value !== index}>
		{value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
	</div>
)

export const SimpleDatabase: React.FC<SimpleDatabaseProps> = ({
	forms,
	formsLoading = false,
}) => {
	const [activeTab, setActiveTab] = useState(0)
	const [selectedFormId, setSelectedFormId] = useState<string>('')
	const [globalError, setGlobalError] = useState<string | null>(null)

	const sortedForms = useMemo(() => {
		return [...forms].sort((a, b) => {
			const aName = (a.title || a.name || '').toLowerCase()
			const bName = (b.title || b.name || '').toLowerCase()
			return aName.localeCompare(bName)
		})
	}, [forms])

	useEffect(() => {
		if (selectedFormId || sortedForms.length === 0) return

		const preferred = sortedForms.find(form => form.isActive) || sortedForms[0]
		setSelectedFormId(preferred.id || preferred._id || '')
	}, [selectedFormId, sortedForms])

	const {
		fields,
		loading: fieldsLoading,
		error,
		updateField,
		getSections,
		getSectionName,
		reload,
	} = useSimpleFields(selectedFormId)

	const sections = getSections()
	const selectedForm = sortedForms.find(
		form => (form.id || form._id) === selectedFormId
	)

	const handleError = (errorMsg: string) => {
		setGlobalError(errorMsg)
		setTimeout(() => setGlobalError(null), 5000)
	}

	return (
		<Box>
			<Paper
				sx={{
					p: { xs: 2, md: 3 },
					borderRadius: 3,
					border: '1px solid',
					borderColor: 'divider',
				}}
			>
				<Stack
					direction={{ xs: 'column', md: 'row' }}
					justifyContent='space-between'
					alignItems={{ xs: 'flex-start', md: 'center' }}
					spacing={2}
					mb={2}
				>
					<Box>
						<Typography variant='h5' component='h2' gutterBottom>
							<StorageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
							Управление базой данных
						</Typography>
						<Typography variant='body2' color='text.secondary'>
							Прямой доступ к данным: поля форм, заявки, пользователи
						</Typography>
					</Box>
				</Stack>

				{globalError && (
					<Alert severity='error' sx={{ mb: 2 }} onClose={() => setGlobalError(null)}>
						{globalError}
					</Alert>
				)}

				<Tabs
					value={activeTab}
					onChange={(_, newValue) => setActiveTab(newValue)}
					sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
				>
					<Tab
						icon={<ListAltIcon />}
						iconPosition='start'
						label='Поля форм'
					/>
					<Tab
						icon={<StorageIcon />}
						iconPosition='start'
						label='Заявки'
					/>
					<Tab
						icon={<PeopleIcon />}
						iconPosition='start'
						label='Пользователи'
					/>
				</Tabs>

				{/* Вкладка: Поля форм */}
				<TabPanel value={activeTab} index={0}>
					<Stack
						direction={{ xs: 'column', md: 'row' }}
						justifyContent='space-between'
						alignItems={{ xs: 'flex-start', md: 'center' }}
						spacing={2}
						mb={3}
					>
						<Stack
							direction={{ xs: 'column', md: 'row' }}
							spacing={2}
							alignItems={{ xs: 'stretch', md: 'center' }}
						>
							<FormControl size='small' sx={{ minWidth: { xs: '100%', md: 260 } }}>
								<InputLabel id='simple-db-form-label'>Форма</InputLabel>
								<Select
									labelId='simple-db-form-label'
									label='Форма'
									value={selectedFormId}
									onChange={event => setSelectedFormId(event.target.value)}
									disabled={formsLoading || sortedForms.length === 0}
								>
									{sortedForms.map(form => {
										const formId = form.id || form._id
										if (!formId) return null

										return (
											<MenuItem key={formId} value={formId}>
												{form.title || form.name}
											</MenuItem>
										)
									})}
								</Select>
							</FormControl>
							{selectedForm && (
								<Stack direction='row' spacing={1} flexWrap='wrap'>
									<Chip
										label={selectedForm.isActive ? 'Активна' : 'Неактивна'}
										color={selectedForm.isActive ? 'success' : 'default'}
										size='small'
										variant={selectedForm.isActive ? 'filled' : 'outlined'}
									/>
									<Chip
										label={`Полей: ${fields.length}`}
										size='small'
										variant='outlined'
									/>
									<Chip
										label={`Разделов: ${sections.length}`}
										size='small'
										variant='outlined'
									/>
								</Stack>
							)}
						</Stack>
						<Button
							variant='outlined'
							startIcon={<Refresh />}
							onClick={reload}
							disabled={fieldsLoading || !selectedFormId}
						>
							Обновить
						</Button>
					</Stack>

					{formsLoading && (
						<Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
							<CircularProgress />
						</Box>
					)}

					{!formsLoading && sortedForms.length === 0 && (
						<Alert severity='info' sx={{ mb: 3 }}>
							Нет доступных форм. Сначала создайте форму во вкладке «Формы».
						</Alert>
					)}

					{error && (
						<Alert severity='error' sx={{ mb: 3 }}>
							{error}
						</Alert>
					)}

					{selectedFormId && !fieldsLoading && (
						<Box mb={2}>
							<Typography variant='subtitle2' gutterBottom color='text.secondary'>
								Статистика
							</Typography>
							<Stack direction='row' spacing={3} flexWrap='wrap'>
								<Typography variant='body2'>
									Всего полей: <strong>{fields.length}</strong>
								</Typography>
								<Typography variant='body2'>
									Разделов: <strong>{sections.length}</strong>
								</Typography>
								<Typography variant='body2'>
									Обычных полей:{' '}
									<strong>
										{
											fields.filter(
												(f: FormField) =>
													f.type !== 'header' && f.type !== 'divider'
											).length
										}
									</strong>
								</Typography>
							</Stack>
						</Box>
					)}

					{selectedFormId && (
						<>
							{fieldsLoading ? (
								<Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
									<CircularProgress />
								</Box>
							) : (
								<FieldsTable
									fields={fields}
									sections={sections}
									onFieldUpdate={updateField}
									getSectionName={getSectionName}
								/>
							)}
						</>
					)}
				</TabPanel>

				{/* Вкладка: Заявки */}
				<TabPanel value={activeTab} index={1}>
					<Alert severity='info' sx={{ mb: 2 }}>
						Таблица заявок с возможностью редактирования заметок и тегов.
						Для полного редактирования используйте Дашборд.
					</Alert>
					<SubmissionsTable onError={handleError} />
				</TabPanel>

				{/* Вкладка: Пользователи */}
				<TabPanel value={activeTab} index={2}>
					<Alert severity='warning' sx={{ mb: 2 }}>
						Внимание! Редактирование пользователей влияет на доступ к системе.
						Будьте осторожны при изменении ролей и паролей.
					</Alert>
					<UsersTable onError={handleError} />
				</TabPanel>
			</Paper>
		</Box>
	)
}
