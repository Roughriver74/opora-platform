import mongoose, { Schema, Document } from 'mongoose'

export interface IFormField extends Document {
	name: string
	label: string
	type: string
	required: boolean
	placeholder?: string
	bitrixFieldId: string
	bitrixFieldType: string
	bitrixEntity?: string // Тип сущности Битрикс24: product, contact, company
	formId?: string
	sectionId?: string // ID раздела к которому принадлежит поле
	options?: Array<{
		value: string
		label: string
	}>
	dynamicSource?: {
		enabled: boolean
		source: string // например 'catalog' для номенклатуры товаров
		filter?: Record<string, any>
	}
	linkedFields?: {
		enabled: boolean
		mappings: Array<{
			targetFieldName: string
			copyDirection: 'from' | 'to' | 'both'
			transformFunction?: string
		}>
		sourceField?: {
			sourceFieldName: string
			sourceFieldLabel?: string
			sourceSectionName?: string
		}
	}
	order: number
}

const FormFieldSchema: Schema = new Schema(
	{
		name: { type: String, required: true },
		label: { type: String, required: true },
		type: { type: String, required: true }, // text, dropdown, number, date и т.д.
		required: { type: Boolean, default: false },
		placeholder: { type: String },
		bitrixFieldId: { type: String, required: false },
		bitrixFieldType: { type: String, required: false },
		bitrixEntity: { type: String, required: false }, // product, contact, company
		options: [
			{
				value: { type: String, required: true },
				label: { type: String, required: true },
			},
		],
		dynamicSource: {
			enabled: { type: Boolean, default: false },
			source: { type: String },
			filter: { type: Schema.Types.Mixed },
		},
		linkedFields: {
			enabled: { type: Boolean, default: false },
			mappings: [
				{
					targetFieldName: { type: String, required: true },
					copyDirection: {
						type: String,
						enum: ['from', 'to', 'both'],
						default: 'both',
					},
					transformFunction: { type: String },
				},
			],
			sourceField: {
				sourceFieldName: { type: String },
				sourceFieldLabel: { type: String },
				sourceSectionName: { type: String },
			},
		},
		order: { type: Number, default: 0 },
		formId: { type: String },
		sectionId: { type: String }, // ID раздела
	},
	{ timestamps: true }
)

// Оптимизированные индексы для FormField
FormFieldSchema.index({ formId: 1, order: 1 }) // Основной запрос - поля формы по порядку
FormFieldSchema.index({ formId: 1, sectionId: 1, order: 1 }) // Поля формы по секциям
FormFieldSchema.index({ name: 1, formId: 1 }) // Поиск поля по имени в форме
FormFieldSchema.index({ type: 1 }) // Группировка по типу поля
FormFieldSchema.index({ 'dynamicSource.enabled': 1, 'dynamicSource.source': 1 }) // Динамические поля
FormFieldSchema.index({ 'linkedFields.enabled': 1 }) // Связанные поля

export default mongoose.model<IFormField>('FormField', FormFieldSchema)
