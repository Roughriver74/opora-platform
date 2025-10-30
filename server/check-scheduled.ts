import { AppDataSource } from './src/database/config/database.config'
import { ScheduledSubmission } from './src/database/entities/ScheduledSubmission.entity'

async function checkScheduled() {
	try {
		await AppDataSource.initialize()
		console.log('✅ Database connected')

		const repo = AppDataSource.getRepository(ScheduledSubmission)

		// Get latest 10 scheduled submissions
		const scheduled = await repo.find({
			order: { createdAt: 'DESC' },
			take: 10,
		})

		console.log('\n=== LATEST 10 SCHEDULED SUBMISSIONS ===')
		scheduled.forEach(s => {
			console.log(`
ID: ${s.id}
Status: ${s.status}
Scheduled Date: ${s.scheduledDate}
Scheduled Time: ${s.scheduledTime || 'null'}
Period Group ID: ${s.periodGroupId || 'null'}
Submission ID: ${s.submissionId || 'Not created yet'}
Form Data Keys: ${Object.keys(s.formData || {}).length}
Created: ${s.createdAt}
---`)
		})

		await AppDataSource.destroy()
		process.exit(0)
	} catch (error) {
		console.error('Error:', error)
		process.exit(1)
	}
}

checkScheduled()
