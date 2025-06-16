import React from 'react'
import {
	Box,
	Alert,
	Card,
	CardContent,
	LinearProgress,
	Snackbar,
} from '@mui/material'
import AutoSaveIcon from '@mui/icons-material/CloudDone'
import { FormEditorProps } from './types'
import { useFormEditor } from './hooks/useFormEditor'
import { useDragAndDrop } from './hooks/useDragAndDrop'
import { useFieldManagement } from './hooks/useFieldManagement'
import { FormHeader } from './components/FormHeader'
import { FormSettings } from './components/FormSettings'
import { FieldsList } from './components/FieldsList'

const FormEditor: React.FC<FormEditorProps> = ({ form, onSave, onBack }) => {
	const {
		state,
		setState,
		handleFormChange,
		handleFormSave,
		getSaveStatus,
		clearError,
		reloadFields,
	} = useFormEditor(form, onSave)

	const dragHandlers = useDragAndDrop(state, setState)

	const {
		addNewField,
		handleFieldSave,
		handleFieldDelete,
		moveFieldToSection,
	} = useFieldManagement(state, setState, reloadFields)

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
					<FieldsList
						fields={state.fields}
						loading={state.loading}
						bitrixFields={state.bitrixFields}
						dragOverIndex={state.dragOverIndex}
						onAddField={addNewField}
						onFieldSave={handleFieldSave}
						onFieldDelete={handleFieldDelete}
						onMoveFieldToSection={moveFieldToSection}
						dragHandlers={dragHandlers}
					/>
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
