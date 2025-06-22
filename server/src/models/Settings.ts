import mongoose, { Document, Schema } from 'mongoose'

export interface ISettings extends Document {
	key: string
	value: any
	description?: string
	category: string
	type: 'boolean' | 'string' | 'number' | 'object'
	updatedAt: Date
	updatedBy?: string
}

const SettingsSchema = new Schema<ISettings>(
	{
		key: {
			type: String,
			required: true,
			unique: true,
			trim: true,
		},
		value: {
			type: Schema.Types.Mixed,
			required: true,
		},
		description: {
			type: String,
			trim: true,
		},
		category: {
			type: String,
			required: true,
			enum: ['general', 'submissions', 'forms', 'integrations', 'ui'],
			default: 'general',
		},
		type: {
			type: String,
			required: true,
			enum: ['boolean', 'string', 'number', 'object'],
		},
		updatedBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
		},
	},
	{
		timestamps: true,
	}
)

// Индексы для быстрого поиска
SettingsSchema.index({ key: 1 })
SettingsSchema.index({ category: 1 })

export default mongoose.model<ISettings>('Settings', SettingsSchema)
