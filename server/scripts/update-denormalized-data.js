const { AppDataSource } = require('../dist/database/config/database.config')
const { Submission } = require('../dist/database/entities/Submission.entity')
const { User } = require('../dist/database/entities/User.entity')
const { Form } = require('../dist/database/entities/Form.entity')

async function updateDenormalizedData() {
	try {
		console.log('Подключение к базе данных...')
		await AppDataSource.initialize()
		console.log('Подключение установлено')

		const submissionRepository = AppDataSource.getRepository(Submission)
		const userRepository = AppDataSource.getRepository(User)
		const formRepository = AppDataSource.getRepository(Form)

		console.log('Получение всех заявок...')
		const submissions = await submissionRepository.find({
			relations: ['user', 'form', 'assignedTo'],
		})

		console.log(`Найдено ${submissions.length} заявок для обновления`)

		let updatedCount = 0

		for (const submission of submissions) {
			const updates = {}

			// Обновляем данные пользователя
			if (submission.user) {
				const userName = submission.user.fullName
				if (submission.userName !== userName) {
					updates.userName = userName
					updates.userEmail = submission.user.email
				}
			}

			// Обновляем данные формы
			if (submission.form) {
				if (submission.formName !== submission.form.name) {
					updates.formName = submission.form.name
				}
				if (submission.formTitle !== submission.form.title) {
					updates.formTitle = submission.form.title
				}
			}

			// Обновляем данные назначенного пользователя
			if (submission.assignedTo) {
				const assignedToName = submission.assignedTo.fullName
				if (submission.assignedToName !== assignedToName) {
					updates.assignedToName = assignedToName
				}
			}

			// Применяем обновления, если есть изменения
			if (Object.keys(updates).length > 0) {
				await submissionRepository.update(submission.id, updates)
				updatedCount++
				console.log(`Обновлена заявка ${submission.submissionNumber}:`, updates)
			}
		}

		console.log(`Обновлено ${updatedCount} заявок`)
		console.log('Обновление завершено')
	} catch (error) {
		console.error('Ошибка при обновлении денормализованных данных:', error)
	} finally {
		if (AppDataSource.isInitialized) {
			await AppDataSource.destroy()
			console.log('Соединение с базой данных закрыто')
		}
	}
}

// Запускаем скрипт
updateDenormalizedData()
