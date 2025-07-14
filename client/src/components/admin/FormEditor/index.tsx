import React, { useState, useCallback } from 'react'
import {
	Box,
	Alert,
	Card,
	CardContent,
	LinearProgress,
	Snackbar,
	Typography,
	Switch,
	FormControlLabel,
	Divider,
} from '@mui/material'
import AutoSaveIcon from '@mui/icons-material/CloudDone'
import { FormEditorProps } from './types'
import { useFormEditor } from './hooks/useFormEditor'
import { useFieldManagement } from './hooks/useFieldManagement'
import { FormHeader } from './components/FormHeader'
import { FormSettings } from './components/FormSettings'
import { FieldsList } from './components/FieldsList'
import { ImprovedFieldsList } from './components/ImprovedFieldsList'
import { AdvancedFieldsList } from './components/AdvancedFieldsList'
import { FormFieldService } from '../../../services/formFieldService'

const FormEditor: React.FC<FormEditorProps> = ({ form, onSave, onBack }) => {
	const [useImprovedUI, setUseImprovedUI] = useState(true)
	const [useAdvancedDragDrop, setUseAdvancedDragDrop] = useState(false)

	const {
		state,
		setState,
		handleFormChange,
		handleFormSave,
		getSaveStatus,
		clearError,
		loadFields,
	} = useFormEditor(form, onSave)

	const {
		addNewField,
		addNewSection,
		addFieldToSection,
		handleFieldSave,
		handleFieldDelete,
		moveFieldToSection,
		normalizeOrders,
	} = useFieldManagement(state, setState, loadFields, form?._id)

	const saveStatus = getSaveStatus()

	// Защита от ошибок состояния
	if (!state || !state.formData) {
		return (
			<Box sx={{ textAlign: 'center', p: 3 }}>
				<LinearProgress sx={{ mb: 2 }} />
				<Typography>Загрузка...</Typography>
			</Box>
		)
	}

	return (
		<Box sx={{ mb: 2 }}>
			{/* Индикатор прогресса */}
			{(state.loading || state.saving || state.autoSaving) && (
				<LinearProgress
					sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }}
				/>
			)}

			{/* Заголовок с индикаторами состояния */}
			<Card elevation={1} sx={{ mb: 2, borderRadius: 1 }}>
				<CardContent sx={{ p: 2 }}>
					<FormHeader
						isEditing={!!(form && form._id)}
						saveStatus={saveStatus}
						hasChanges={state.hasChanges}
						saving={state.saving}
						autoSaving={state.autoSaving}
						onSave={handleFormSave}
						onBack={onBack}
					/>

					{state.error && (
						<Alert severity='error' sx={{ mb: 1.5 }} onClose={clearError}>
							{state.error}
						</Alert>
					)}

					{/* Основные настройки формы */}
					<FormSettings
						formData={state.formData}
						dealCategories={state.dealCategories}
						onFormChange={handleFormChange}
					/>
				</CardContent>
			</Card>

			{/* Поля формы */}
			<Card elevation={1} sx={{ borderRadius: 1 }}>
				<CardContent sx={{ p: 2 }}>
					{/* Переключатели UI */}
					<Box sx={{ mb: 2 }}>
						<FormControlLabel
							control={
								<Switch
									checked={useImprovedUI}
									onChange={e => setUseImprovedUI(e.target.checked)}
									color='primary'
								/>
							}
							label='Использовать улучшенный интерфейс'
						/>
						{useImprovedUI && (
							<FormControlLabel
								control={
									<Switch
										checked={useAdvancedDragDrop}
										onChange={e => setUseAdvancedDragDrop(e.target.checked)}
										color='secondary'
									/>
								}
								label='Продвинутый drag & drop'
								sx={{ ml: 2 }}
							/>
						)}
					</Box>
					<Divider sx={{ mb: 2 }} />

					{useImprovedUI ? (
						useAdvancedDragDrop ? (
							<AdvancedFieldsList
								state={state}
								setState={setState}
								onAddField={addNewField}
								onAddSection={addNewSection}
								onFieldSave={handleFieldSave}
								onFieldDelete={handleFieldDelete}
							/>
						) : (
							<ImprovedFieldsList
								state={state}
								setState={setState}
								onAddField={addNewField}
								onAddSection={addNewSection}
								onFieldSave={handleFieldSave}
								onFieldDelete={handleFieldDelete}
							/>
						)
					) : (
						<FieldsList
							fields={state.fields}
							loading={state.loading}
							bitrixFields={state.bitrixFields}
							dragOverIndex={state.dragOverIndex}
							onAddField={addNewField}
							onAddSection={addNewSection}
							onAddFieldToSection={addFieldToSection}
							onFieldSave={handleFieldSave}
							onFieldDelete={handleFieldDelete}
							onMoveFieldToSection={moveFieldToSection}
							onNormalizeOrders={normalizeOrders}
							dragHandlers={{
								handleDragStart: () => {},
								handleDragOver: () => {},
								handleDragLeave: () => {},
								handleDrop: async () => {},
								handleDragEnd: () => {},
							}}
						/>
					)}
				</CardContent>
			</Card>

			{/* Уведомления */}
			<Snackbar
				open={state.showSuccess}
				autoHideDuration={3000}
				onClose={() => setState(prev => ({ ...prev, showSuccess: false }))}
				anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
			>
				<Alert
					onClose={() => setState(prev => ({ ...prev, showSuccess: false }))}
					severity='success'
					variant='filled'
					icon={<AutoSaveIcon />}
				>
					Форма успешно сохранена!
				</Alert>
			</Snackbar>
		</Box>
	)
}

export default FormEditor
