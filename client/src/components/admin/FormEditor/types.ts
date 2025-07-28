import { Form, FormField } from '../../../types'

export interface DealCategory {
	ID: string
	NAME: string
	[key: string]: any
}

export interface FormEditorProps {
	form?: Form
	onSave: (form: Form) => void
	onBack?: () => void
}

export interface SaveStatus {
	text: string
	color: 'info' | 'warning' | 'success' | 'default'
}

export interface FormEditorState {
	formData: Partial<Form>
	fields: FormField[]
	bitrixFields: Record<string, any>
	dealCategories: DealCategory[]
	loading: boolean
	error: string | null
	hasChanges: boolean
	saving: boolean
	autoSaving: boolean
	lastSaved: Date | null
	showSuccess: boolean
	draggedField: FormField | null
	dragOverIndex: number | null
}

export interface DragHandlers {
	handleDragStart: (
		e: React.DragEvent<HTMLDivElement>,
		field: FormField,
		index: number
	) => void
	handleDragOver: (e: React.DragEvent<HTMLDivElement>, index: number) => void
	handleDragLeave: () => void
	handleDrop: (
		e: React.DragEvent<HTMLDivElement>,
		targetIndex: number
	) => Promise<void>
	handleDragEnd: (e: React.DragEvent<HTMLDivElement>) => void
}
