const { AppDataSource } = require('../database/config/database.config')
const { Submission } = require('../database/entities/Submission.entity')
const {
	ElasticsearchService,
} = require('../services/elasticsearchService')

async function indexSubmissionsToElasticsearch() {
	try {
		console.log('Подключение к базе данных...')
		await AppDataSource.initialize()
		console.log('Подключение установлено')

		console.log('Инициализация Elasticsearch...')
		const elasticsearchService = new ElasticsearchService()
		await elasticsearchService.initializeIndex()
		console.log('Elasticsearch инициализирован')

		const submissionRepository = AppDataSource.getRepository(Submission)

		console.log('Получение всех заявок...')
		const submissions = await submissionRepository.find({
			relations: ['user', 'form', 'assignedTo'],
		})

		console.log(`Найдено ${submissions.length} заявок для индексации`)

		let indexedCount = 0
		let errorCount = 0

		for (const submission of submissions) {
			try {
				// Подготавливаем данные для индексации
				const submissionData = {
					id: submission.id,
					submissionNumber: submission.submissionNumber,
					title: submission.title,
					status: submission.status,
					priority: submission.priority,
					notes: submission.notes,
					tags: submission.tags || [],
					formData: submission.formData || {},
					createdAt: submission.createdAt,
					updatedAt: submission.updatedAt,
					// Денормализованные данные
					userName: submission.userName,
					userEmail: submission.userEmail,
					formName: submission.formName,
					formTitle: submission.formTitle,
					assignedToName: submission.assignedToName,
				}

				await elasticsearchService.indexSubmission(submissionData)
				indexedCount++

				if (indexedCount % 10 === 0) {
					console.log(`Проиндексировано ${indexedCount} заявок...`)
				}
			} catch (error) {
				console.error(
					`Ошибка при индексации заявки ${submission.submissionNumber}:`,
					error.message
				)
				errorCount++
			}
		}

		console.log(`Индексация завершена:`)
		console.log(`- Успешно проиндексировано: ${indexedCount}`)
		console.log(`- Ошибок: ${errorCount}`)
		console.log(`- Всего обработано: ${submissions.length}`)
	} catch (error) {
		console.error('Ошибка при индексации заявок:', error)
	} finally {
		if (AppDataSource.isInitialized) {
			await AppDataSource.destroy()
			console.log('Соединение с базой данных закрыто')
		}
	}
}

// Запускаем скрипт
indexSubmissionsToElasticsearch()
