import mongoose from 'mongoose'
import config from './config'

const connectDB = async (): Promise<void> => {
	try {
		console.log('🔌 Попытка подключения к MongoDB...')
		console.log(
			'URI:',
			config.mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
		) // Скрываем пароль

		await mongoose.connect(config.mongoUri)

		console.log('✅ MongoDB подключена успешно')
		console.log('Database:', mongoose.connection.name)
		console.log('Host:', mongoose.connection.host)

		// Проверим количество пользователей в базе
		const User = mongoose.model('User')
		const userCount = await User.countDocuments()
		console.log(`👥 Количество пользователей в базе: ${userCount}`)
	} catch (error) {
		console.error('❌ Ошибка подключения к MongoDB:', error)
		process.exit(1)
	}
}

export default connectDB
