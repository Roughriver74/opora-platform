import React, { useState, useEffect, useMemo } from 'react'
import {
	Box,
	Typography,
	Card,
	CardContent,
	Alert,
	Button,
	Stack,
	Chip,
	Tab,
	Tabs,
	CircularProgress,
	Paper,
	Divider,
} from '@mui/material'
import { Refresh, Download, Upload, Settings } from '@mui/icons-material'
import { FormField } from '../../../types'
import { useFormFields } from './hooks/useFormFields'
import { useUsers } from './hooks/useUsers'
import { FieldsTable } from './components/FieldsTable'
import { DatabaseTable } from './components/DatabaseTable'
import { SectionSelector } from './components/SectionSelector'

interface DatabaseManagerProps {
	formId: string
}

const DatabaseManager: React.FC<DatabaseManagerProps> = ({ formId }) => {
	const [activeTab, setActiveTab] = useState(0)
	const [selectedSection, setSelectedSection] = useState<string>('')

	// Хуки для загрузки данных
	const {
		fields: formFieldsData,
		loading: formFieldsLoading,
		updateField,
		error: formFieldsError,
		loadFields: reloadFields,
	} = useFormFields(formId)

	const {
		users,
		loading: usersLoading,
		error: usersError,
		updateUser,
		loadUsers: reloadUsers,
	} = useUsers()

	// Группировка полей по секциям
	const fieldsBySection = useMemo(() => {
		if (!formFieldsData || formFieldsData.length === 0) return {}

		const sections: Record<string, FormField[]> = {}

		// Сначала получаем все секции (поля типа header)
		const headerFields = formFieldsData.filter(field => field.type === 'header')

		// Создаем секции по заголовкам
		headerFields.forEach(header => {
			if (header._id) {
				sections[header.label || header.name || 'Без названия'] = []
			}
		})

		// Добавляем секцию для полей без секции
		sections['Без секции'] = []

		// Распределяем поля по секциям
		formFieldsData.forEach(field => {
			if (field.type === 'header') return // Пропускаем сами заголовки

			if (field.sectionId) {
				const headerField = headerFields.find(h => h._id === field.sectionId)
				const sectionName = headerField
					? headerField.label || headerField.name || 'Без названия'
					: 'Без секции'
				if (sections[sectionName]) {
					sections[sectionName].push(field)
				} else {
					sections['Без секции'].push(field)
				}
			} else {
				sections['Без секции'].push(field)
			}
		})

		return sections
	}, [formFieldsData])

	// Фильтрация полей по выбранной секции
	const filteredFields = useMemo(() => {
		if (!selectedSection || !formFieldsData) return formFieldsData || []

		if (selectedSection === 'Без секции') {
			return formFieldsData.filter(
				field => field.type !== 'header' && !field.sectionId
			)
		}

		// Найдем ID секции по названию
		const headerFields = formFieldsData.filter(field => field.type === 'header')
		const sectionHeader = headerFields.find(
			h => (h.label || h.name || 'Без названия') === selectedSection
		)

		if (sectionHeader) {
			return formFieldsData.filter(
				field =>
					field.type !== 'header' && field.sectionId === sectionHeader._id
			)
		}

		return []
	}, [formFieldsData, selectedSection])

	const handleRefresh = async () => {
		await Promise.all([reloadFields(), reloadUsers()])
	}

	const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
		setActiveTab(newValue)
	}

	const handleSectionChange = (section: string) => {
		setSelectedSection(section)
	}

	const renderContent = () => {
		switch (activeTab) {
			case 0:
				return (
					<Box>
						<SectionSelector
							sections={Object.keys(fieldsBySection)}
							selectedSection={selectedSection}
							onSectionChange={handleSectionChange}
						/>
						<FieldsTable
							fields={filteredFields}
							onUpdateField={updateField}
							loading={formFieldsLoading}
						/>
					</Box>
				)
			case 1:
				return (
					<DatabaseTable
						users={users}
						onUpdateUser={updateUser}
						loading={usersLoading}
					/>
				)
			default:
				return null
		}
	}

	return (
		<Box sx={{ p: 3 }}>
			<Paper elevation={1} sx={{ borderRadius: 2 }}>
				<Box sx={{ p: 3 }}>
					<Stack
						direction='row'
						justifyContent='space-between'
						alignItems='center'
						sx={{ mb: 3 }}
					>
						<Typography variant='h4' component='h1'>
							База данных
						</Typography>
						<Button
							variant='outlined'
							startIcon={<Refresh />}
							onClick={handleRefresh}
							disabled={formFieldsLoading || usersLoading}
						>
							Обновить
						</Button>
					</Stack>

					{/* Ошибки */}
					{(formFieldsError || usersError) && (
						<Alert severity='error' sx={{ mb: 3 }}>
							{formFieldsError || usersError}
						</Alert>
					)}

					{/* Статистика */}
					<Stack direction='row' spacing={2} sx={{ mb: 3 }}>
						<Chip
							label={`Полей: ${formFieldsData?.length || 0}`}
							color='primary'
							variant='outlined'
						/>
						<Chip
							label={`Пользователей: ${users?.length || 0}`}
							color='secondary'
							variant='outlined'
						/>
						<Chip
							label={`Секций: ${Object.keys(fieldsBySection).length}`}
							color='info'
							variant='outlined'
						/>
					</Stack>

					{/* Вкладки */}
					<Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
						<Tab label='Поля формы' />
						<Tab label='Пользователи' />
					</Tabs>

					<Divider sx={{ mb: 3 }} />

					{/* Загрузка */}
					{(formFieldsLoading || usersLoading) && (
						<Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
							<CircularProgress />
						</Box>
					)}

					{/* Содержимое */}
					{!formFieldsLoading && !usersLoading && renderContent()}
				</Box>
			</Paper>
		</Box>
	)
}

export default DatabaseManager
