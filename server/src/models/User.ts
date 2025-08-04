import mongoose, { Document, Schema } from 'mongoose'
import bcrypt from 'bcrypt'

export interface IUser extends Document {
	email: string
	password: string
	firstName?: string
	lastName?: string
	phone?: string
	bitrix_id?: string
	bitrixUserId?: string
	status?: 'active' | 'inactive'
	role: 'user' | 'admin'
	isActive: boolean
	settings: {
		onlyMyCompanies: boolean
	}
	lastLogin?: Date
	createdAt: Date
	updatedAt: Date
	fullName: string // виртуальное поле
	comparePassword(password: string): Promise<boolean>
}

const UserSchema: Schema = new Schema(
	{
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
		},
		password: {
			type: String,
			required: true,
		},
		firstName: {
			type: String,
			trim: true,
		},
		lastName: {
			type: String,
			trim: true,
		},
		phone: {
			type: String,
			trim: true,
		},
		bitrix_id: {
			type: String,
			trim: true,
		},
		bitrixUserId: {
			type: String,
			trim: true,
		},
		lastLogin: {
			type: Date,
		},
		status: {
			type: String,
			enum: ['active', 'inactive'],
			default: 'active',
		},
		role: {
			type: String,
			enum: ['user', 'admin'],
			default: 'user',
		},
		isActive: {
			type: Boolean,
			default: true,
		},
		settings: {
			onlyMyCompanies: {
				type: Boolean,
				default: false,
			},
		},
	},
	{
		timestamps: true,
	}
)

// Индексы для оптимизации поиска
UserSchema.index({ role: 1 })
UserSchema.index({ isActive: 1 })

// Хеширование пароля перед сохранением
UserSchema.pre('save', async function (next) {
	if (!this.isModified('password')) return next()

	try {
		const salt = await bcrypt.genSalt(10)
		this.password = await bcrypt.hash(this.password.toString(), salt)
		next()
	} catch (error: any) {
		next(error)
	}
})

// Метод для сравнения паролей
UserSchema.methods.comparePassword = async function (
	password: string
): Promise<boolean> {
	return bcrypt.compare(password, this.password)
}

// Виртуальное поле для полного имени
UserSchema.virtual('fullName').get(function (this: IUser) {
	if (this.firstName && this.lastName) {
		return `${this.firstName} ${this.lastName}`
	}
	return this.firstName || this.lastName || this.email
})

// Настройка JSON сериализации
UserSchema.set('toJSON', {
	virtuals: true,
	transform: function (doc, ret) {
		delete ret.password // Убираем пароль из JSON ответа
		return ret
	},
})

export default mongoose.model<IUser>('User', UserSchema)
