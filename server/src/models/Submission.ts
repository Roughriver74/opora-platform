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

	// Денормализованные данные для ускорения запросов (избегаем populate)
	formName?: string // Название формы (кэш из Form.name)
	formTitle?: string // Заголовок формы (кэш из Form.title)
	userEmail?: string // Email пользователя (кэш из User.email)
	userName?: string // Имя пользователя (кэш из User.fullName)
	assignedToName?: string // Имя ответственного (кэш из User.fullName)

	// Предвычисленные поля для отчетности
	dayOfWeek?: number // День недели создания (0-6)
	monthOfYear?: number // Месяц создания (1-12)
	yearCreated?: number // Год создания
	processingTimeMinutes?: number // Время обработки в минутах (от создания до закрытия)
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
		// Денормализованные поля для ускорения запросов
		formName: {
			type: String,
		},
		formTitle: {
			type: String,
		},
		userEmail: {
			type: String,
		},
		userName: {
			type: String,
		},
		assignedToName: {
			type: String,
		},
		// Предвычисленные поля для отчетности
		dayOfWeek: {
			type: Number,
			min: 0,
			max: 6,
		},
		monthOfYear: {
			type: Number,
			min: 1,
			max: 12,
		},
		yearCreated: {
			type: Number,
		},
		processingTimeMinutes: {
			type: Number,
		},
	},
	{
		timestamps: true, // автоматически добавляет createdAt и updatedAt
	}
)

// Pre-save hooks для генерации номера и заполнения денормализованных данных
SubmissionSchema.pre('save', async function (next) {
	try {
		// Генерация номера заявки
		if (this.isNew && !this.submissionNumber) {
			console.log('Генерация номера заявки...')

			const today = new Date()
			const year = today.getFullYear()
			const month = String(today.getMonth() + 1).padStart(2, '0')
			const day = String(today.getDate()).padStart(2, '0')

			const randomSuffix = Math.floor(Math.random() * 9999)
				.toString()
				.padStart(4, '0')

			this.submissionNumber = `${year}${month}${day}${randomSuffix}`
			console.log('Сгенерированный номер заявки:', this.submissionNumber)
		}

		// Заполнение предвычисленных полей при создании
		if (this.isNew) {
			const createdDate = this.createdAt || new Date()
			this.dayOfWeek = createdDate.getDay()
			this.monthOfYear = createdDate.getMonth() + 1
			this.yearCreated = createdDate.getFullYear()
		}

		// Заполнение денормализованных данных при необходимости
		if (this.isNew || this.isModified('formId')) {
			const Form = mongoose.model('Form')
			const form = await Form.findById(this.formId).select('name title')
			if (form) {
				this.formName = form.name
				this.formTitle = form.title
			}
		}

		if (this.isNew || this.isModified('userId')) {
			if (this.userId) {
				const User = mongoose.model('User')
				const user = await User.findById(this.userId).select('email firstName lastName')
				if (user) {
					this.userEmail = user.email
					this.userName = user.firstName && user.lastName 
						? `${user.firstName} ${user.lastName}` 
						: user.firstName || user.lastName || user.email
				}
			}
		}

		if (this.isNew || this.isModified('assignedTo')) {
			if (this.assignedTo) {
				const User = mongoose.model('User')
				const assignee = await User.findById(this.assignedTo).select('firstName lastName email')
				if (assignee) {
					this.assignedToName = assignee.firstName && assignee.lastName 
						? `${assignee.firstName} ${assignee.lastName}` 
						: assignee.firstName || assignee.lastName || assignee.email
				}
			} else {
				this.assignedToName = undefined
			}
		}

		// Вычисление времени обработки при изменении статуса на завершенный
		if (this.isModified('status') && ['WON', 'LOSE', 'COMPLETED', 'CLOSED'].includes(this.status)) {
			const processingTime = Date.now() - this.createdAt.getTime()
			this.processingTimeMinutes = Math.round(processingTime / (1000 * 60))
		}

		next()
	} catch (error) {
		console.error('Ошибка в pre-save hook для Submission:', error)
		// Генерируем fallback номер если что-то пошло не так
		if (this.isNew && !this.submissionNumber) {
			this.submissionNumber = `SUB${Date.now()}`
			console.log('Использован fallback номер:', this.submissionNumber)
		}
		next()
	}
})

// Оптимизированные индексы для лучшей производительности
// Composite индексы для часто используемых запросов
SubmissionSchema.index({ status: 1, createdAt: -1 }) // Сортировка по статусу + дате
SubmissionSchema.index({ userId: 1, status: 1, createdAt: -1 }) // Заявки пользователя по статусу
SubmissionSchema.index({ assignedTo: 1, status: 1, createdAt: -1 }) // Заявки ответственного по статусу
SubmissionSchema.index({ formId: 1, createdAt: -1 }) // Заявки формы по дате
SubmissionSchema.index({ bitrixSyncStatus: 1, createdAt: -1 }) // Статус синхронизации с Битрикс24
SubmissionSchema.index({ priority: 1, status: 1 }) // Приоритет + статус для админов
SubmissionSchema.index({ tags: 1, status: 1 }) // Поиск по тегам
SubmissionSchema.index({ createdAt: -1 }) // Общая сортировка по дате (оставляем для совместимости)

// Индексы для денормализованных полей (ускоряют отчеты без populate)
SubmissionSchema.index({ userEmail: 1, status: 1 }) // Поиск по email пользователя
SubmissionSchema.index({ formName: 1, createdAt: -1 }) // Группировка по типу формы
SubmissionSchema.index({ yearCreated: 1, monthOfYear: 1 }) // Отчеты по периодам
SubmissionSchema.index({ assignedToName: 1, status: 1 }) // Быстрый поиск по ответственному

// Виртуальные поля
SubmissionSchema.virtual('submittedAt').get(function () {
	return this.createdAt
})

export default mongoose.model<ISubmission>('Submission', SubmissionSchema)
