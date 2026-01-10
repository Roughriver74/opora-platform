import React, { useState, useEffect } from 'react'
import {
	Box,
	Typography,
	Paper,
	TextField,
	Button,
	IconButton,
	Accordion,
	AccordionSummary,
	AccordionDetails,
	Chip,
	Alert,
	Tooltip,
	Divider,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import SaveIcon from '@mui/icons-material/Save'
import { settingsService } from '../../../services/settingsService'

interface MaterialConfig {
	priority: number
	label: string
	fields: string[]
	volumeFields: string[]
}

interface MaterialFieldsConfig {
	[key: string]: MaterialConfig
}

interface Props {
	onSave?: () => void
}

const defaultConfig: MaterialFieldsConfig = {
	concrete: {
		priority: 1,
		label: 'Бетон',
		fields: [],
		volumeFields: [],
	},
	mortar: {
		priority: 2,
		label: 'Раствор',
		fields: [],
		volumeFields: [],
	},
	cps: {
		priority: 3,
		label: 'ЦПС',
		fields: [],
		volumeFields: [],
	},
}

const MaterialFieldsConfigEditor: React.FC<Props> = ({ onSave }) => {
	const [config, setConfig] = useState<MaterialFieldsConfig>(defaultConfig)
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState(false)
	const [newFieldInputs, setNewFieldInputs] = useState<Record<string, string>>({})
	const [newVolumeFieldInputs, setNewVolumeFieldInputs] = useState<Record<string, string>>({})

	useEffect(() => {
		loadConfig()
	}, [])

	const loadConfig = async () => {
		try {
			setLoading(true)
			const loadedConfig = await settingsService.getSettingValue<MaterialFieldsConfig>(
				'submissions.material_fields_config',
				defaultConfig
			)
			setConfig(loadedConfig || defaultConfig)
		} catch (err) {
			console.error('Ошибка загрузки конфигурации:', err)
			setConfig(defaultConfig)
		} finally {
			setLoading(false)
		}
	}

	const handleSave = async () => {
		try {
			setSaving(true)
			setError(null)
			await settingsService.updateSettingValue('submissions.material_fields_config', config)
			setSuccess(true)
			setTimeout(() => setSuccess(false), 3000)
			onSave?.()
		} catch (err) {
			console.error('Ошибка сохранения:', err)
			setError('Ошибка сохранения конфигурации')
		} finally {
			setSaving(false)
		}
	}

	const updateMaterialConfig = (
		materialKey: string,
		field: keyof MaterialConfig,
		value: any
	) => {
		setConfig(prev => ({
			...prev,
			[materialKey]: {
				...prev[materialKey],
				[field]: value,
			},
		}))
	}

	const addField = (materialKey: string, type: 'fields' | 'volumeFields') => {
		const inputKey = `${materialKey}_${type}`
		const inputValue = type === 'fields'
			? newFieldInputs[materialKey]
			: newVolumeFieldInputs[materialKey]

		if (!inputValue?.trim()) return

		const currentFields = config[materialKey][type]
		if (!currentFields.includes(inputValue.trim())) {
			updateMaterialConfig(materialKey, type, [...currentFields, inputValue.trim()])
		}

		if (type === 'fields') {
			setNewFieldInputs(prev => ({ ...prev, [materialKey]: '' }))
		} else {
			setNewVolumeFieldInputs(prev => ({ ...prev, [materialKey]: '' }))
		}
	}

	const removeField = (materialKey: string, type: 'fields' | 'volumeFields', fieldId: string) => {
		const currentFields = config[materialKey][type]
		updateMaterialConfig(
			materialKey,
			type,
			currentFields.filter(f => f !== fieldId)
		)
	}

	const addNewMaterial = () => {
		const newKey = `material_${Date.now()}`
		setConfig(prev => ({
			...prev,
			[newKey]: {
				priority: Object.keys(prev).length + 1,
				label: 'Новый материал',
				fields: [],
				volumeFields: [],
			},
		}))
	}

	const removeMaterial = (materialKey: string) => {
		if (window.confirm(`Удалить материал "${config[materialKey].label}"?`)) {
			setConfig(prev => {
				const newConfig = { ...prev }
				delete newConfig[materialKey]
				return newConfig
			})
		}
	}

	if (loading) {
		return <Typography>Загрузка конфигурации...</Typography>
	}

	// Сортируем материалы по приоритету
	const sortedMaterials = Object.entries(config).sort(
		([, a], [, b]) => a.priority - b.priority
	)

	return (
		<Paper sx={{ p: 3 }}>
			<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
				<Typography variant="h6">
					Конфигурация полей материалов
				</Typography>
				<Box sx={{ display: 'flex', gap: 1 }}>
					<Button
						variant="outlined"
						startIcon={<AddIcon />}
						onClick={addNewMaterial}
						size="small"
					>
						Добавить материал
					</Button>
					<Button
						variant="contained"
						startIcon={<SaveIcon />}
						onClick={handleSave}
						disabled={saving}
						size="small"
					>
						{saving ? 'Сохранение...' : 'Сохранить'}
					</Button>
				</Box>
			</Box>

			{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
			{success && <Alert severity="success" sx={{ mb: 2 }}>Конфигурация сохранена</Alert>}

			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				Материалы отображаются в карточках заявок по приоритету: если выбран материал с высшим
				приоритетом (меньшее число), он будет показан. Если нет - проверяется следующий по приоритету.
			</Typography>

			{sortedMaterials.map(([materialKey, materialConfig]) => (
				<Accordion key={materialKey} defaultExpanded>
					<AccordionSummary expandIcon={<ExpandMoreIcon />}>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
							<Chip
								label={`Приоритет: ${materialConfig.priority}`}
								size="small"
								color="primary"
							/>
							<Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
								{materialConfig.label}
							</Typography>
							<Chip
								label={`${materialConfig.fields.length} полей`}
								size="small"
								variant="outlined"
							/>
							<Chip
								label={`${materialConfig.volumeFields.length} полей объема`}
								size="small"
								variant="outlined"
							/>
						</Box>
					</AccordionSummary>
					<AccordionDetails>
						<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
							{/* Основные настройки */}
							<Box sx={{ display: 'flex', gap: 2 }}>
								<TextField
									label="Название"
									value={materialConfig.label}
									onChange={e => updateMaterialConfig(materialKey, 'label', e.target.value)}
									size="small"
									sx={{ width: 200 }}
								/>
								<TextField
									label="Приоритет"
									type="number"
									value={materialConfig.priority}
									onChange={e => updateMaterialConfig(materialKey, 'priority', Number(e.target.value))}
									size="small"
									sx={{ width: 120 }}
									helperText="Меньше = выше"
								/>
								<Box sx={{ flexGrow: 1 }} />
								<Tooltip title="Удалить материал">
									<IconButton
										color="error"
										onClick={() => removeMaterial(materialKey)}
									>
										<DeleteIcon />
									</IconButton>
								</Tooltip>
							</Box>

							<Divider />

							{/* Поля материала */}
							<Box>
								<Typography variant="subtitle2" gutterBottom>
									ID полей материала (autocomplete поля формы)
								</Typography>
								<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
									{materialConfig.fields.map(fieldId => (
										<Chip
											key={fieldId}
											label={fieldId}
											onDelete={() => removeField(materialKey, 'fields', fieldId)}
											size="small"
										/>
									))}
									{materialConfig.fields.length === 0 && (
										<Typography variant="body2" color="text.secondary">
											Нет полей
										</Typography>
									)}
								</Box>
								<Box sx={{ display: 'flex', gap: 1 }}>
									<TextField
										placeholder="field_..."
										value={newFieldInputs[materialKey] || ''}
										onChange={e => setNewFieldInputs(prev => ({
											...prev,
											[materialKey]: e.target.value
										}))}
										size="small"
										sx={{ width: 250 }}
										onKeyPress={e => {
											if (e.key === 'Enter') {
												addField(materialKey, 'fields')
											}
										}}
									/>
									<Button
										variant="outlined"
										size="small"
										onClick={() => addField(materialKey, 'fields')}
									>
										Добавить
									</Button>
								</Box>
							</Box>

							<Divider />

							{/* Поля объема */}
							<Box>
								<Typography variant="subtitle2" gutterBottom>
									ID полей объема (number/text поля формы)
								</Typography>
								<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
									{materialConfig.volumeFields.map(fieldId => (
										<Chip
											key={fieldId}
											label={fieldId}
											onDelete={() => removeField(materialKey, 'volumeFields', fieldId)}
											size="small"
											color="secondary"
										/>
									))}
									{materialConfig.volumeFields.length === 0 && (
										<Typography variant="body2" color="text.secondary">
											Нет полей объема
										</Typography>
									)}
								</Box>
								<Box sx={{ display: 'flex', gap: 1 }}>
									<TextField
										placeholder="field_..."
										value={newVolumeFieldInputs[materialKey] || ''}
										onChange={e => setNewVolumeFieldInputs(prev => ({
											...prev,
											[materialKey]: e.target.value
										}))}
										size="small"
										sx={{ width: 250 }}
										onKeyPress={e => {
											if (e.key === 'Enter') {
												addField(materialKey, 'volumeFields')
											}
										}}
									/>
									<Button
										variant="outlined"
										size="small"
										onClick={() => addField(materialKey, 'volumeFields')}
									>
										Добавить
									</Button>
								</Box>
							</Box>
						</Box>
					</AccordionDetails>
				</Accordion>
			))}
		</Paper>
	)
}

export default MaterialFieldsConfigEditor
