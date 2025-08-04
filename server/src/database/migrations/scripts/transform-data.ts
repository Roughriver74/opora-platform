import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'

interface TransformMapping {
	[mongoId: string]: string // MongoDB ObjectId -> PostgreSQL UUID
}

interface TransformedData {
	users: any[]
	forms: any[]
	formFields: any[]
	submissions: any[]
	mappings: {
		users: TransformMapping
		forms: TransformMapping
		submissions: TransformMapping
	}
}

class DataTransformer {
	private sourceDir: string
	private targetDir: string
	private mappings: {
		users: TransformMapping
		forms: TransformMapping
		submissions: TransformMapping
	}

	constructor(exportDir: string) {
		this.sourceDir = exportDir
		this.targetDir = path.join(path.dirname(exportDir), `transform-${Date.now()}`)
		
		// Создание директории для трансформированных данных
		if (!fs.existsSync(this.targetDir)) {
			fs.mkdirSync(this.targetDir, { recursive: true })
		}

		this.mappings = {
			users: {},
			forms: {},
			submissions: {},
		}
	}

	private generateUUID(mongoId: string, entityType: 'users' | 'forms' | 'submissions'): string {
		if (!this.mappings[entityType][mongoId]) {
			this.mappings[entityType][mongoId] = uuidv4()
		}
		return this.mappings[entityType][mongoId]
	}

	private loadJsonFile(filename: string): any[] {
		const filePath = path.join(this.sourceDir, filename)
		const data = fs.readFileSync(filePath, 'utf-8')
		return JSON.parse(data)
	}

	private saveJsonFile(filename: string, data: any): void {
		const filePath = path.join(this.targetDir, filename)
		fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
		console.log(`   ✅ Сохранено в ${filename}`)
	}

	transformUsers(users: any[]): any[] {
		console.log('🔄 Трансформация пользователей...')
		
		const transformed = users.map(user => ({
			id: this.generateUUID(user._id, 'users'),
			email: user.email.toLowerCase(),
			password: user.password, // Уже захеширован
			firstName: user.firstName || null,
			lastName: user.lastName || null,
			phone: user.phone || null,
			bitrix_id: user.bitrix_id || null,
			bitrixUserId: user.bitrixUserId || null,
			status: user.status || 'active',
			role: user.role || 'user',
			isActive: user.isActive === true,
			settings: user.settings || { onlyMyCompanies: false },
			lastLogin: user.lastLogin ? new Date(user.lastLogin).toISOString() : null,
			createdAt: new Date(user.createdAt).toISOString(),
			updatedAt: new Date(user.updatedAt || user.createdAt).toISOString(),
		}))

		console.log(`   Трансформировано ${transformed.length} пользователей`)
		return transformed
	}

	transformForms(forms: any[]): any[] {
		console.log('🔄 Трансформация форм...')
		
		const transformed = forms.map(form => ({
			id: this.generateUUID(form._id, 'forms'),
			name: form.name,
			title: form.title,
			description: form.description || null,
			isActive: form.isActive === true,
			bitrixDealCategory: form.bitrixDealCategory || null,
			successMessage: form.successMessage || 'Спасибо! Ваша заявка успешно отправлена.',
			createdAt: new Date(form.createdAt).toISOString(),
			updatedAt: new Date(form.updatedAt || form.createdAt).toISOString(),
		}))

		console.log(`   Трансформировано ${transformed.length} форм`)
		return transformed
	}

	transformFormFields(fields: any[], forms: any[]): any[] {
		console.log('🔄 Трансформация полей форм...')
		
		// Создание маппинга старых ID форм
		const formIdMapping: { [key: string]: string } = {}
		forms.forEach(form => {
			if (form._id && this.mappings.forms[form._id]) {
				formIdMapping[form._id] = this.mappings.forms[form._id]
			}
		})

		const transformed = fields.map(field => ({
			id: uuidv4(), // Новый UUID для каждого поля
			formId: formIdMapping[field.formId] || null,
			sectionId: field.sectionId || null,
			name: field.name,
			label: field.label,
			type: field.type,
			required: field.required === true,
			placeholder: field.placeholder || null,
			bitrixFieldId: field.bitrixFieldId || null,
			bitrixFieldType: field.bitrixFieldType || null,
			bitrixEntity: field.bitrixEntity || null,
			options: field.options || null,
			dynamicSource: field.dynamicSource || null,
			linkedFields: field.linkedFields || null,
			order: field.order || 0,
			createdAt: new Date(field.createdAt).toISOString(),
			updatedAt: new Date(field.updatedAt || field.createdAt).toISOString(),
		}))

		console.log(`   Трансформировано ${transformed.length} полей`)
		return transformed
	}

	transformSubmissions(submissions: any[]): any[] {
		console.log('🔄 Трансформация заявок...')
		
		const transformed = submissions.map(sub => {
			const createdDate = new Date(sub.createdAt)
			
			return {
				id: this.generateUUID(sub._id, 'submissions'),
				submissionNumber: sub.submissionNumber || this.generateSubmissionNumber(createdDate),
				formId: sub.formId ? (this.mappings.forms[sub.formId] || null) : null,
				userId: sub.userId ? (this.mappings.users[sub.userId] || null) : null,
				assignedToId: sub.assignedTo ? (this.mappings.users[sub.assignedTo] || null) : null,
				title: sub.title || 'Без названия',
				status: sub.status || 'NEW',
				priority: sub.priority || 'medium',
				bitrixDealId: sub.bitrixDealId || null,
				bitrixCategoryId: sub.bitrixCategoryId || null,
				bitrixSyncStatus: sub.bitrixSyncStatus || 'pending',
				bitrixSyncError: sub.bitrixSyncError || null,
				notes: sub.notes || null,
				tags: Array.isArray(sub.tags) ? sub.tags : [],
				// Денормализованные данные
				formName: sub.formName || null,
				formTitle: sub.formTitle || null,
				userEmail: sub.userEmail || null,
				userName: sub.userName || null,
				assignedToName: sub.assignedToName || null,
				// Предвычисленные поля
				dayOfWeek: sub.dayOfWeek ?? createdDate.getDay(),
				monthOfYear: sub.monthOfYear ?? (createdDate.getMonth() + 1),
				yearCreated: sub.yearCreated ?? createdDate.getFullYear(),
				processingTimeMinutes: sub.processingTimeMinutes || null,
				createdAt: createdDate.toISOString(),
				updatedAt: new Date(sub.updatedAt || sub.createdAt).toISOString(),
			}
		})

		console.log(`   Трансформировано ${transformed.length} заявок`)
		return transformed
	}

	private generateSubmissionNumber(date: Date): string {
		const year = date.getFullYear()
		const month = String(date.getMonth() + 1).padStart(2, '0')
		const day = String(date.getDate()).padStart(2, '0')
		const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
		return `${year}${month}${day}${random}`
	}

	async transformAll(): Promise<void> {
		console.log('🚀 Начало трансформации данных...')
		console.log(`📁 Исходная директория: ${this.sourceDir}`)
		console.log(`📁 Целевая директория: ${this.targetDir}`)

		try {
			// Загрузка данных
			const users = this.loadJsonFile('users.json')
			const forms = this.loadJsonFile('forms.json')
			const formFields = this.loadJsonFile('formFields.json')
			const submissions = this.loadJsonFile('submissions.json')

			// Трансформация
			const transformedData: TransformedData = {
				users: this.transformUsers(users),
				forms: this.transformForms(forms),
				formFields: this.transformFormFields(formFields, forms),
				submissions: this.transformSubmissions(submissions),
				mappings: this.mappings,
			}

			// Сохранение трансформированных данных
			this.saveJsonFile('users.json', transformedData.users)
			this.saveJsonFile('forms.json', transformedData.forms)
			this.saveJsonFile('formFields.json', transformedData.formFields)
			this.saveJsonFile('submissions.json', transformedData.submissions)
			this.saveJsonFile('id-mappings.json', transformedData.mappings)

			// Сохранение сводной информации
			const summary = {
				transformDate: new Date().toISOString(),
				sourceDir: this.sourceDir,
				targetDir: this.targetDir,
				statistics: {
					users: transformedData.users.length,
					forms: transformedData.forms.length,
					formFields: transformedData.formFields.length,
					submissions: transformedData.submissions.length,
				},
				mappings: {
					users: Object.keys(transformedData.mappings.users).length,
					forms: Object.keys(transformedData.mappings.forms).length,
					submissions: Object.keys(transformedData.mappings.submissions).length,
				},
			}

			this.saveJsonFile('transform-summary.json', summary)

			console.log('\n📊 Статистика трансформации:')
			console.log(`   Пользователи: ${summary.statistics.users}`)
			console.log(`   Формы: ${summary.statistics.forms}`)
			console.log(`   Поля форм: ${summary.statistics.formFields}`)
			console.log(`   Заявки: ${summary.statistics.submissions}`)
			
			console.log('\n✅ Трансформация завершена успешно!')
			
		} catch (error) {
			console.error('❌ Ошибка трансформации:', error)
			throw error
		}
	}

	validateTransform(): void {
		console.log('\n🔍 Валидация трансформированных данных...')
		
		const files = ['users.json', 'forms.json', 'formFields.json', 'submissions.json']
		let isValid = true

		for (const file of files) {
			const filePath = path.join(this.targetDir, file)
			
			try {
				const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
				console.log(`   ✅ ${file}: ${data.length} записей`)
				
				// Проверка UUID
				if (data.length > 0) {
					const sample = data[0]
					const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
					
					if (!uuidRegex.test(sample.id)) {
						console.error(`   ❌ ${file}: невалидный UUID`)
						isValid = false
					}
				}
			} catch (error) {
				console.error(`   ❌ Ошибка валидации ${file}:`, error)
				isValid = false
			}
		}

		if (isValid) {
			console.log('\n✅ Валидация пройдена успешно')
		} else {
			console.log('\n❌ Валидация завершена с ошибками')
		}
	}
}

// Запуск трансформации
if (require.main === module) {
	const exportDir = process.argv[2]
	
	if (!exportDir) {
		console.error('Использование: ts-node transform-data.ts <путь-к-экспортированным-данным>')
		process.exit(1)
	}

	const transformer = new DataTransformer(exportDir)
	
	transformer.transformAll()
		.then(() => transformer.validateTransform())
		.catch(error => {
			console.error('Критическая ошибка:', error)
			process.exit(1)
		})
}

export default DataTransformer