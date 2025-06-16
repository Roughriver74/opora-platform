import React, { useState } from 'react'
import {
	Box,
	Typography,
	Switch,
	FormControlLabel,
	Button,
	Chip,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	TextField,
	Autocomplete,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	Alert,
	IconButton,
	Tooltip,
	Divider,
} from '@mui/material'
import {
	Add as AddIcon,
	Delete as DeleteIcon,
	Link as LinkIcon,
	Info as InfoIcon,
	ContentCopy as CopyIcon,
} from '@mui/icons-material'
import { FormField } from '../../../../types'

interface LinkedFieldsSettingsProps {
	formField: FormField
	availableFields: FormField[]
	onChange: (field: FormField) => void
}

interface FieldMapping {
	targetFieldName: string
	targetFieldLabel: string
	copyDirection: 'from' | 'to' | 'both'
}

export const LinkedFieldsSettings: React.FC<LinkedFieldsSettingsProps> = ({
	formField,
	availableFields,
	onChange,
}) => {
	const [mappingDialogOpen, setMappingDialogOpen] = useState(false)
	const [newMapping, setNewMapping] = useState<FieldMapping>({
		targetFieldName: '',
		targetFieldLabel: '',
		copyDirection: 'both',
	})

	const linkedFields = formField.linkedFields || {
		enabled: false,
		mappings: [],
	}

	// Фильтруем доступные поля (исключаем текущее поле и поля типа header/divider)
	const compatibleFields = availableFields.filter(
		field =>
			field.name !== formField.name &&
			!['header', 'divider'].includes(field.type) &&
			areFieldTypesCompatible(formField.type, field.type)
	)

	// Получаем поля с группировкой по разделам
	const fieldsBySection = React.useMemo(() => {
		const sections: Record<string, FormField[]> = {}

		compatibleFields.forEach(field => {
			// Определяем раздел по порядку (сотни)
			const sectionNumber = Math.floor(field.order / 100)
			const sectionName = `Раздел ${sectionNumber}`

			if (!sections[sectionName]) {
				sections[sectionName] = []
			}
			sections[sectionName].push(field)
		})

		return sections
	}, [compatibleFields])

	const handleEnabledChange = (enabled: boolean) => {
		onChange({
			...formField,
			linkedFields: {
				...linkedFields,
				enabled,
			},
		})
	}

	// Обработчик изменения простого поля-источника
	const handleSourceFieldChange = (sourceFieldName: string | null) => {
		const sourceField = compatibleFields.find(f => f.name === sourceFieldName)

		onChange({
			...formField,
			linkedFields: {
				...linkedFields,
				sourceField: sourceField
					? {
							sourceFieldName: sourceField.name,
							sourceFieldLabel: sourceField.label,
							sourceSectionName: `Раздел ${Math.floor(
								sourceField.order / 100
							)}`,
					  }
					: undefined,
			},
		})
	}

	const handleAddMapping = () => {
		if (!newMapping.targetFieldName) return

		const targetField = availableFields.find(
			f => f.name === newMapping.targetFieldName
		)
		if (!targetField) return

		const updatedMappings = [
			...linkedFields.mappings,
			{
				...newMapping,
				targetFieldLabel: targetField.label,
			},
		]

		onChange({
			...formField,
			linkedFields: {
				...linkedFields,
				mappings: updatedMappings,
			},
		})

		setNewMapping({
			targetFieldName: '',
			targetFieldLabel: '',
			copyDirection: 'both',
		})
		setMappingDialogOpen(false)
	}

	const handleRemoveMapping = (index: number) => {
		const updatedMappings = linkedFields.mappings.filter((_, i) => i !== index)
		onChange({
			...formField,
			linkedFields: {
				...linkedFields,
				mappings: updatedMappings,
			},
		})
	}

	const getDirectionLabel = (direction: string) => {
		switch (direction) {
			case 'from':
				return 'Копировать из этого поля'
			case 'to':
				return 'Копировать в это поле'
			case 'both':
				return 'Двунаправленное копирование'
			default:
				return direction
		}
	}

	const getDirectionColor = (direction: string) => {
		switch (direction) {
			case 'from':
				return 'primary'
			case 'to':
				return 'secondary'
			case 'both':
				return 'success'
			default:
				return 'default'
		}
	}

	return (
		<Box sx={{ mt: 2 }}>
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
				<LinkIcon color='primary' />
				<Typography variant='h6'>Связанные поля</Typography>
				<Tooltip title='Настройка автоматического копирования данных между полями'>
					<IconButton size='small'>
						<InfoIcon fontSize='small' />
					</IconButton>
				</Tooltip>
			</Box>

			<FormControlLabel
				control={
					<Switch
						checked={linkedFields.enabled}
						onChange={e => handleEnabledChange(e.target.checked)}
					/>
				}
				label='Включить связанные поля'
			/>

			{linkedFields.enabled && (
				<Box sx={{ mt: 2 }}>
					{/* Простая настройка поля-источника */}
					<Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
							<CopyIcon color='primary' fontSize='small' />
							<Typography variant='subtitle1' fontWeight='medium'>
								Копировать значение из поля
							</Typography>
						</Box>

						<Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
							Выберите поле, из которого будет копироваться значение при нажатии
							кнопки "Копировать" в разделе формы
						</Typography>

						<Autocomplete
							value={linkedFields.sourceField?.sourceFieldName || null}
							onChange={(_, value) => handleSourceFieldChange(value)}
							options={compatibleFields.map(field => field.name)}
							getOptionLabel={option => {
								const field = compatibleFields.find(f => f.name === option)
								return field ? field.label : option
							}}
							groupBy={option => {
								const field = compatibleFields.find(f => f.name === option)
								if (!field) return 'Другие'
								const sectionNumber = Math.floor(field.order / 100)
								return `Раздел ${sectionNumber}`
							}}
							renderInput={params => (
								<TextField
									{...params}
									label='Поле-источник'
									placeholder='Выберите поле, из которого копировать'
									variant='outlined'
									size='small'
								/>
							)}
							renderOption={(props, option) => {
								const field = compatibleFields.find(f => f.name === option)
								return (
									<li {...props}>
										<Box>
											<Typography variant='body2'>{field?.label}</Typography>
											<Typography variant='caption' color='text.secondary'>
												{field?.type} • {field?.name}
											</Typography>
										</Box>
									</li>
								)
							}}
							fullWidth
						/>

						{linkedFields.sourceField && (
							<Box sx={{ mt: 1 }}>
								<Chip
									label={`${linkedFields.sourceField.sourceFieldLabel} (${linkedFields.sourceField.sourceSectionName})`}
									size='small'
									color='primary'
									variant='outlined'
									onDelete={() => handleSourceFieldChange(null)}
								/>
							</Box>
						)}
					</Box>

					<Divider sx={{ my: 2 }} />

					{/* Расширенные настройки связей */}
					<Box sx={{ mb: 2 }}>
						<Box
							sx={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								mb: 2,
							}}
						>
							<Typography variant='subtitle1'>
								Расширенные связи полей ({linkedFields.mappings.length})
							</Typography>
							<Button
								startIcon={<AddIcon />}
								onClick={() => setMappingDialogOpen(true)}
								variant='outlined'
								size='small'
								disabled={compatibleFields.length === 0}
							>
								Добавить связь
							</Button>
						</Box>

						<Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
							Дополнительные связи для сложных сценариев копирования данных
						</Typography>

						{compatibleFields.length === 0 && (
							<Alert severity='warning' sx={{ mb: 2 }}>
								Нет совместимых полей для создания связей. Убедитесь, что в
								форме есть другие поля подходящего типа.
							</Alert>
						)}

						{linkedFields.mappings.length === 0 ? (
							<Typography variant='body2' color='text.secondary'>
								Дополнительные связи не настроены
							</Typography>
						) : (
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
								{linkedFields.mappings.map((mapping, index) => (
									<Box
										key={index}
										sx={{
											display: 'flex',
											alignItems: 'center',
											gap: 1,
											p: 1,
											border: 1,
											borderColor: 'divider',
											borderRadius: 1,
											bgcolor: 'background.paper',
										}}
									>
										<Box sx={{ flex: 1 }}>
											<Typography variant='body2' fontWeight='medium'>
												{mapping.targetFieldLabel}
											</Typography>
											<Typography variant='caption' color='text.secondary'>
												{mapping.targetFieldName}
											</Typography>
										</Box>
										<Chip
											label={getDirectionLabel(mapping.copyDirection)}
											color={getDirectionColor(mapping.copyDirection) as any}
											size='small'
										/>
										<IconButton
											size='small'
											color='error'
											onClick={() => handleRemoveMapping(index)}
										>
											<DeleteIcon fontSize='small' />
										</IconButton>
									</Box>
								))}
							</Box>
						)}
					</Box>
				</Box>
			)}

			{/* Диалог добавления расширенной связи */}
			<Dialog
				open={mappingDialogOpen}
				onClose={() => setMappingDialogOpen(false)}
				maxWidth='md'
				fullWidth
			>
				<DialogTitle>Добавить связь поля</DialogTitle>
				<DialogContent>
					<Box sx={{ pt: 1 }}>
						<Alert severity='info' sx={{ mb: 2 }}>
							<strong>Двунаправленное:</strong> Поля могут копировать данные
							друг в друга
							<br />
							<strong>Из этого поля:</strong> Данные копируются только из этого
							поля в целевое
							<br />
							<strong>В это поле:</strong> Данные копируются только из целевого
							поля в это
						</Alert>

						<FormControl fullWidth sx={{ mb: 2 }}>
							<InputLabel>Связанное поле</InputLabel>
							<Select
								value={newMapping.targetFieldName}
								onChange={e =>
									setNewMapping({
										...newMapping,
										targetFieldName: e.target.value,
										targetFieldLabel:
											compatibleFields.find(f => f.name === e.target.value)
												?.label || '',
									})
								}
								label='Связанное поле'
							>
								{compatibleFields.map(field => (
									<MenuItem key={field.name} value={field.name}>
										{field.label} ({field.type})
									</MenuItem>
								))}
							</Select>
						</FormControl>

						<FormControl fullWidth>
							<InputLabel>Направление копирования</InputLabel>
							<Select
								value={newMapping.copyDirection}
								onChange={e =>
									setNewMapping({
										...newMapping,
										copyDirection: e.target.value as 'from' | 'to' | 'both',
									})
								}
								label='Направление копирования'
							>
								<MenuItem value='from'>Копировать из этого поля</MenuItem>
								<MenuItem value='to'>Копировать в это поле</MenuItem>
								<MenuItem value='both'>Двунаправленное копирование</MenuItem>
							</Select>
						</FormControl>
					</Box>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setMappingDialogOpen(false)}>Отмена</Button>
					<Button
						onClick={handleAddMapping}
						variant='contained'
						disabled={!newMapping.targetFieldName}
					>
						Добавить
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	)
}

// Функция для проверки совместимости типов полей
function areFieldTypesCompatible(type1: string, type2: string): boolean {
	// Текстовые поля совместимы между собой
	const textTypes = ['text', 'textarea', 'autocomplete']
	if (textTypes.includes(type1) && textTypes.includes(type2)) {
		return true
	}

	// Числовые поля могут копироваться в текстовые
	if (type1 === 'number' && textTypes.includes(type2)) {
		return true
	}

	// Текстовые поля могут копироваться в числовые (с преобразованием)
	if (textTypes.includes(type1) && type2 === 'number') {
		return true
	}

	// Поля выбора совместимы между собой
	const selectTypes = ['select', 'autocomplete', 'radio']
	if (selectTypes.includes(type1) && selectTypes.includes(type2)) {
		return true
	}

	// Точное совпадение типов
	return type1 === type2
}
