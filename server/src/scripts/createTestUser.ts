import mongoose from 'mongoose'
import User from '../models/User'
import dotenv from 'dotenv'

// Загружаем переменные окружения
dotenv.config()

const createTestUser = async (): Promise<void> => {
	try {
		// Подключаемся к базе данных
		await mongoose.connect(
			process.env.MONGODB_URI || 'mongodb://localhost:27017/beton-crm'
		)
		console.log('✅ Подключение к MongoDB установлено')

		// Проверяем, есть ли уже тестовый пользователь
		const existingUser = await User.findOne({ email: 'user@betonexpress.pro' })
		if (existingUser) {
			console.log('ℹ️  Тестовый пользователь уже существует')
			console.log('📧 Email: user@betonexpress.pro')
			console.log('🔑 Пароль: user123')
			process.exit(0)
		}

		// Создаем тестового пользователя
		const testUser = new User({
			email: 'user@betonexpress.pro',
			password: 'user123',
			firstName: 'Тестовый',
			lastName: 'Пользователь',
			role: 'user',
			isActive: true,
			status: 'active',
		})

		await testUser.save()

		console.log('🎉 Тестовый пользователь создан успешно!')
		console.log('📧 Email: user@betonexpress.pro')
		console.log('🔑 Пароль: user123')
		console.log('👤 Роль: user')
	} catch (error) {
		console.error('❌ Ошибка создания тестового пользователя:', error)
	} finally {
		await mongoose.disconnect()
		console.log('🔌 Отключение от MongoDB')
		process.exit(0)
	}
}

// Запускаем скрипт
createTestUser()
