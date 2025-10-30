import { AppDataSource } from './src/database/config/database.config'
import { Submission } from './src/database/entities/Submission.entity'

async function checkSubmissions() {
	try {
		await AppDataSource.initialize()
		console.log('✅ Database connected')

		const repo = AppDataSource.getRepository(Submission)

		const submissions = await repo.find({
			where: [
				{ bitrixDealId: '25959' },
				{ bitrixDealId: '25957' },
				{ bitrixDealId: '25958' },
			],
			order: { createdAt: 'DESC' },
		})

		console.log(`\n=== Найдено ${submissions.length} заявок ===\n`)

		submissions.forEach(s => {
			console.log('=== ЗАЯВКА ===')
			console.log('Submission #:', s.submissionNumber)
			console.log('Bitrix ID:', s.bitrixDealId)
			console.log('Title:', s.title)
			console.log('isPeriodSubmission:', s.isPeriodSubmission)
			console.log('periodGroupId:', s.periodGroupId || 'null')
			console.log('periodStartDate:', s.periodStartDate || 'null')
			console.log('periodEndDate:', s.periodEndDate || 'null')
			console.log('Created:', s.createdAt)
			console.log('\nForm Data Keys:', Object.keys(s.formData || {}).length)

			// Проверяем заполненные поля (не пустые)
			const filledFields: Record<string, any> = {}
			for (const [key, value] of Object.entries(s.formData || {})) {
				if (value && value !== '' && value !== null) {
					filledFields[key] = value
				}
			}

			console.log('Filled Fields:', Object.keys(filledFields).length)
			console.log('Sample Data:', JSON.stringify(filledFields).substring(0, 300))
			console.log('---\n')
		})

		await AppDataSource.destroy()
		process.exit(0)
	} catch (error) {
		console.error('Error:', error)
		process.exit(1)
	}
}

checkSubmissions()
