import 'reflect-metadata'
import { AppDataSource } from '../database/config/database.config'
import { User, UserRole, UserStatus } from '../database/entities/User.entity'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'

// Загружаем переменные окружения
dotenv.config()

const createTestUser = async (): Promise<void> => {
	try {
		// Инициализируем TypeORM подключение
		await AppDataSource.initialize()

		const userRepository = AppDataSource.getRepository(User)

		// Проверяем, есть ли уже тестовый пользователь
		const existingUser = await userRepository.findOne({ 
			where: { email: 'user@betonexpress.pro' } 
		})
		if (existingUser) {
			process.exit(0)
		}

		// Создаем тестового пользователя
		const hashedPassword = await bcrypt.hash('user123', 10)
		const testUser = new User()
		testUser.email = 'user@betonexpress.pro'
		testUser.password = hashedPassword
		testUser.firstName = 'Тестовый'
		testUser.lastName = 'Пользователь'
		testUser.role = UserRole.USER
		testUser.isActive = true
		testUser.status = UserStatus.ACTIVE

		await userRepository.save(testUser)

	} catch (error) {
		console.error('❌ Ошибка создания тестового пользователя:', error)
	} finally {
		await AppDataSource.destroy()
		process.exit(0)
	}
}

// Запускаем скрипт
createTestUser()
