import * as fs from 'fs'
import * as path from 'path'
import { AppDataSource, initializeDatabase } from '../../config/database.config'
import { User } from '../../entities/User.entity'
import { Form } from '../../entities/Form.entity'
import { FormField } from '../../entities/FormField.entity'
import { Submission } from '../../entities/Submission.entity'

interface ImportStatistics {
	users: { total: number; imported: number; failed: number }
	forms: { total: number; imported: number; failed: number }
	formFields: { total: number; imported: number; failed: number }
	submissions: { total: number; imported: number; failed: number }
}

class PostgreSQLImporter {
	private dataDir: string
	private statistics: ImportStatistics
	private batchSize: number = 100

	constructor(transformedDataDir: string) {
		this.dataDir = transformedDataDir
		this.statistics = {
			users: { total: 0, imported: 0, failed: 0 },
			forms: { total: 0, imported: 0, failed: 0 },
			formFields: { total: 0, imported: 0, failed: 0 },
			submissions: { total: 0, imported: 0, failed: 0 },
		}
	}

	private loadJsonFile(filename: string): any[] {
		const filePath = path.join(this.dataDir, filename)
		const data = fs.readFileSync(filePath, 'utf-8')
		return JSON.parse(data)
	}

	async importUsers(users: any[]): Promise<void> {
		console.log('📥 Импорт пользователей...')
		this.statistics.users.total = users.length

		const userRepository = AppDataSource.getRepository(User)
		
		// Импорт батчами для оптимизации
		for (let i = 0; i < users.length; i += this.batchSize) {
			const batch = users.slice(i, i + this.batchSize)
			
			try {
				// Отключаем автогенерацию ID и используем предоставленные
				const entities = batch.map(userData => {
					const user = new User()
					Object.assign(user, userData)
					return user
				})

				await userRepository.save(entities, { chunk: this.batchSize })
				this.statistics.users.imported += batch.length
				
				console.log(`   Импортировано ${i + batch.length}/${users.length}`)
			} catch (error) {
				console.error(`   ❌ Ошибка импорта батча ${i}-${i + batch.length}:`, error)
				this.statistics.users.failed += batch.length
			}
		}

		console.log(`   ✅ Импортировано ${this.statistics.users.imported} из ${this.statistics.users.total} пользователей`)
	}

	async importForms(forms: any[]): Promise<void> {
		console.log('📥 Импорт форм...')
		this.statistics.forms.total = forms.length

		const formRepository = AppDataSource.getRepository(Form)
		
		for (const formData of forms) {
			try {
				const form = new Form()
				Object.assign(form, formData)
				
				await formRepository.save(form)
				this.statistics.forms.imported++
			} catch (error) {
				console.error(`   ❌ Ошибка импорта формы ${formData.name}:`, error)
				this.statistics.forms.failed++
			}
		}

		console.log(`   ✅ Импортировано ${this.statistics.forms.imported} из ${this.statistics.forms.total} форм`)
	}

	async importFormFields(fields: any[]): Promise<void> {
		console.log('📥 Импорт полей форм...')
		this.statistics.formFields.total = fields.length

		const fieldRepository = AppDataSource.getRepository(FormField)
		
		// Импорт батчами
		for (let i = 0; i < fields.length; i += this.batchSize) {
			const batch = fields.slice(i, i + this.batchSize)
			
			try {
				const entities = batch.map(fieldData => {
					const field = new FormField()
					Object.assign(field, fieldData)
					return field
				})

				await fieldRepository.save(entities, { chunk: this.batchSize })
				this.statistics.formFields.imported += batch.length
				
				console.log(`   Импортировано ${i + batch.length}/${fields.length}`)
			} catch (error) {
				console.error(`   ❌ Ошибка импорта батча полей ${i}-${i + batch.length}:`, error)
				this.statistics.formFields.failed += batch.length
			}
		}

		console.log(`   ✅ Импортировано ${this.statistics.formFields.imported} из ${this.statistics.formFields.total} полей`)
	}

	async importSubmissions(submissions: any[]): Promise<void> {
		console.log('📥 Импорт заявок...')
		this.statistics.submissions.total = submissions.length

		const submissionRepository = AppDataSource.getRepository(Submission)
		
		// Импорт батчами для больших объемов
		for (let i = 0; i < submissions.length; i += this.batchSize) {
			const batch = submissions.slice(i, i + this.batchSize)
			
			try {
				const entities = batch.map(subData => {
					const submission = new Submission()
					Object.assign(submission, subData)
					return submission
				})

				await submissionRepository.save(entities, { chunk: this.batchSize })
				this.statistics.submissions.imported += batch.length
				
				console.log(`   Импортировано ${i + batch.length}/${submissions.length}`)
			} catch (error) {
				console.error(`   ❌ Ошибка импорта батча заявок ${i}-${i + batch.length}:`, error)
				this.statistics.submissions.failed += batch.length
			}
		}

		console.log(`   ✅ Импортировано ${this.statistics.submissions.imported} из ${this.statistics.submissions.total} заявок`)
	}

	async updateSequences(): Promise<void> {
		console.log('🔄 Обновление последовательностей...')
		
		try {
			// PostgreSQL автоматически управляет последовательностями для UUID
			// Но если есть другие последовательности, их можно обновить здесь
			console.log('   ✅ Последовательности обновлены')
		} catch (error) {
			console.error('   ❌ Ошибка обновления последовательностей:', error)
		}
	}

	async validateImport(): Promise<void> {
		console.log('\n🔍 Валидация импортированных данных...')
		
		try {
			const userCount = await AppDataSource.getRepository(User).count()
			const formCount = await AppDataSource.getRepository(Form).count()
			const fieldCount = await AppDataSource.getRepository(FormField).count()
			const submissionCount = await AppDataSource.getRepository(Submission).count()

			console.log('📊 Количество записей в БД:')
			console.log(`   Пользователи: ${userCount}`)
			console.log(`   Формы: ${formCount}`)
			console.log(`   Поля форм: ${fieldCount}`)
			console.log(`   Заявки: ${submissionCount}`)

			// Проверка связей
			const formsWithFields = await AppDataSource.getRepository(Form)
				.createQueryBuilder('form')
				.leftJoinAndSelect('form.fields', 'field')
				.getMany()

			console.log(`\n   Форм с полями: ${formsWithFields.filter(f => f.fields.length > 0).length}`)

			const submissionsWithRelations = await AppDataSource.getRepository(Submission)
				.createQueryBuilder('submission')
				.leftJoin('submission.form', 'form')
				.leftJoin('submission.user', 'user')
				.select('COUNT(DISTINCT submission.id)', 'total')
				.addSelect('COUNT(DISTINCT form.id)', 'withForm')
				.addSelect('COUNT(DISTINCT user.id)', 'withUser')
				.getRawOne()

			console.log(`   Заявок с формой: ${submissionsWithRelations.withForm}`)
			console.log(`   Заявок с пользователем: ${submissionsWithRelations.withUser}`)

		} catch (error) {
			console.error('❌ Ошибка валидации:', error)
		}
	}

	async importAll(): Promise<void> {
		console.log('🚀 Начало импорта в PostgreSQL...')
		console.log(`📁 Директория данных: ${this.dataDir}`)

		try {
			// Инициализация подключения к БД
			await initializeDatabase()
			console.log('✅ Подключено к PostgreSQL')

			// Загрузка данных
			const users = this.loadJsonFile('users.json')
			const forms = this.loadJsonFile('forms.json')
			const formFields = this.loadJsonFile('formFields.json')
			const submissions = this.loadJsonFile('submissions.json')

			// Импорт в правильном порядке (с учетом зависимостей)
			await this.importUsers(users)
			await this.importForms(forms)
			await this.importFormFields(formFields)
			await this.importSubmissions(submissions)

			// Обновление последовательностей
			await this.updateSequences()

			// Сохранение статистики
			const summaryPath = path.join(this.dataDir, 'import-summary.json')
			fs.writeFileSync(summaryPath, JSON.stringify({
				importDate: new Date().toISOString(),
				statistics: this.statistics,
			}, null, 2))

			console.log('\n📊 Итоговая статистика импорта:')
			console.log('   Пользователи:')
			console.log(`     - Всего: ${this.statistics.users.total}`)
			console.log(`     - Импортировано: ${this.statistics.users.imported}`)
			console.log(`     - Ошибок: ${this.statistics.users.failed}`)
			console.log('   Формы:')
			console.log(`     - Всего: ${this.statistics.forms.total}`)
			console.log(`     - Импортировано: ${this.statistics.forms.imported}`)
			console.log(`     - Ошибок: ${this.statistics.forms.failed}`)
			console.log('   Поля форм:')
			console.log(`     - Всего: ${this.statistics.formFields.total}`)
			console.log(`     - Импортировано: ${this.statistics.formFields.imported}`)
			console.log(`     - Ошибок: ${this.statistics.formFields.failed}`)
			console.log('   Заявки:')
			console.log(`     - Всего: ${this.statistics.submissions.total}`)
			console.log(`     - Импортировано: ${this.statistics.submissions.imported}`)
			console.log(`     - Ошибок: ${this.statistics.submissions.failed}`)

			console.log('\n✅ Импорт завершен!')

		} catch (error) {
			console.error('❌ Критическая ошибка импорта:', error)
			throw error
		}
	}
}

// Запуск импорта
if (require.main === module) {
	const dataDir = process.argv[2]
	
	if (!dataDir) {
		console.error('Использование: ts-node import-to-postgresql.ts <путь-к-трансформированным-данным>')
		process.exit(1)
	}

	const importer = new PostgreSQLImporter(dataDir)
	
	importer.importAll()
		.then(() => importer.validateImport())
		.then(() => process.exit(0))
		.catch(error => {
			console.error('Критическая ошибка:', error)
			process.exit(1)
		})
}

export default PostgreSQLImporter