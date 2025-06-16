import mongoose, { Document, Schema } from 'mongoose'

export interface ISubmission extends Document {
	_id: string
	submissionNumber: string // Уникальный номер заявки
	formId: mongoose.Types.ObjectId // Ссылка на форму для получения маппинга полей
	userId?: mongoose.Types.ObjectId // Пользователь, отправивший заявку
	title: string // Название заявки (дублируем из Битрикс24 для быстрого доступа)
	status: string
	priority: 'low' | 'medium' | 'high' | 'urgent'

	// Битрикс24 интеграция - основное хранилище данных
	bitrixDealId?: string // Может быть пустым при создании, заполняется после создания сделки в Битрикс24
	bitrixCategoryId?: string // ID категории сделки в Битрикс24
	bitrixSyncStatus: 'pending' | 'synced' | 'failed'
	bitrixSyncError?: string

	// Метаданные
	submittedAt: Date
	updatedAt: Date
	createdAt: Date
	assignedTo?: mongoose.Types.ObjectId // Назначенный менеджер
	notes?: string // Внутренние заметки
	tags: string[] // Теги для категоризации
}

const SubmissionSchema = new Schema<ISubmission>(
	{
		submissionNumber: {
			type: String,
			unique: true,
			required: false, // Убираем required, так как генерируется в pre-save hook
		},
		formId: {
			type: Schema.Types.ObjectId,
			ref: 'Form',
			required: true,
		},
		userId: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: false, // Может быть анонимная заявка
		},
		title: {
			type: String,
			required: true,
		},
		status: {
			type: String,
			default: 'NEW',
		},
		priority: {
			type: String,
			enum: ['low', 'medium', 'high', 'urgent'],
			default: 'medium',
		},
		bitrixDealId: {
			type: String,
			required: false, // Может быть пустым при создании, заполняется после создания сделки в Битрикс24
		},
		bitrixCategoryId: {
			type: String,
			sparse: true,
		},
		bitrixSyncStatus: {
			type: String,
			enum: ['pending', 'synced', 'failed'],
			default: 'pending',
		},
		bitrixSyncError: {
			type: String,
		},
		assignedTo: {
			type: Schema.Types.ObjectId,
			ref: 'User',
		},
		notes: {
			type: String,
		},
		tags: [
			{
				type: String,
			},
		],
	},
	{
		timestamps: true, // автоматически добавляет createdAt и updatedAt
	}
)

// Создание уникального номера заявки
SubmissionSchema.pre('save', async function (next) {
	try {
		if (this.isNew && !this.submissionNumber) {
			console.log('Генерация номера заявки...')

			const today = new Date()
			const year = today.getFullYear()
			const month = String(today.getMonth() + 1).padStart(2, '0')
			const day = String(today.getDate()).padStart(2, '0')

			console.log('Дата для номера заявки:', { year, month, day })

			// Более простая и надежная генерация номера
			const randomSuffix = Math.floor(Math.random() * 9999)
				.toString()
				.padStart(4, '0')

			this.submissionNumber = `${year}${month}${day}${randomSuffix}`
			console.log('Сгенерированный номер заявки:', this.submissionNumber)
		}
		next()
	} catch (error) {
		console.error('Ошибка в pre-save hook для submissionNumber:', error)
		// Генерируем fallback номер если что-то пошло не так
		if (this.isNew && !this.submissionNumber) {
			this.submissionNumber = `SUB${Date.now()}`
			console.log('Использован fallback номер:', this.submissionNumber)
		}
		next()
	}
})

// Индексы для оптимизации
// Убираем дублирующиеся индексы - submissionNumber уже имеет unique: true
SubmissionSchema.index({ formId: 1 })
SubmissionSchema.index({ userId: 1 })
SubmissionSchema.index({ status: 1 })
SubmissionSchema.index({ createdAt: -1 })
SubmissionSchema.index({ assignedTo: 1 })

// Виртуальные поля
SubmissionSchema.virtual('submittedAt').get(function () {
	return this.createdAt
})

export default mongoose.model<ISubmission>('Submission', SubmissionSchema)
