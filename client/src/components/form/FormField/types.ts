import { FormField as FormFieldType, FormFieldOption } from '../../../types'

export interface FormFieldProps {
	field: FormFieldType
	value: any
	onChange: (name: string, value: any) => void
	error?: string
	compact?: boolean
	preloadedOptions?: FormFieldOption[]
}

export interface FieldInputProps {
	field: FormFieldType
	value: any
	onChange: (name: string, value: any) => void
	error?: string
	compact?: boolean
	options?: FormFieldOption[]
	loading?: boolean
	onSearchChange?: (query: string) => void
}

export interface DynamicOptionsConfig {
	enabled: boolean
	source: 'catalog' | 'companies' | 'contacts'
	minSearchLength?: number
}
