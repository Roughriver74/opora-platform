import { Form, FormField as FormFieldType } from '../../../types'

export interface BetoneFormProps {
	form: Form
	fields: FormFieldType[]
	editData?: {
		submissionId: string
		formId: string
		formData: Record<string, any>
	}
}

export interface FormSection {
	title: string
	fields: FormFieldType[]
	number?: number
}

export interface SectionMap {
	[sectionNumber: number]: {
		title: string
		fields: FormFieldType[]
	}
}

export interface SubmitResult {
	success: boolean
	message: string
}

export interface FormProgress {
	totalFields: number
	filledFields: number
	percentage: number
}

export interface ScrollBehavior {
	showScrollTop: boolean
	scrollToTop: () => void
}

export interface FormValidationConfig {
	generateValidationSchema: (fields: FormFieldType[]) => any
	generateInitialValues: (fields: FormFieldType[]) => Record<string, any>
}
