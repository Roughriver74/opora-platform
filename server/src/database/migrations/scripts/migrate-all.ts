#!/usr/bin/env node

import * as path from 'path'
import * as fs from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'
import MongoDBExporter from './export-from-mongodb'
import DataTransformer from './transform-data'
import PostgreSQLImporter from './import-to-postgresql'
import * as dotenv from 'dotenv'

dotenv.config()

const execAsync = promisify(exec)

interface MigrationOptions {
	skipExport?: boolean
	skipTransform?: boolean
	skipImport?: boolean
	exportDir?: string
	transformDir?: string
	dryRun?: boolean
	backup?: boolean
}

class MigrationOrchestrator {
	private options: MigrationOptions
	private exportDir: string = ''
	private transformDir: string = ''
	private logFile: string

	constructor(options: MigrationOptions = {}) {
		this.options = options
		const timestamp = new Date().toISOString().replace(/:/g, '-')
		this.logFile = path.join(__dirname, `../logs/migration-${timestamp}.log`)
		
		// Создание директории для логов
		const logDir = path.dirname(this.logFile)
		if (!fs.existsSync(logDir)) {
			fs.mkdirSync(logDir, { recursive: true })
		}
	}

	private log(message: string, level: 'info' | 'error' | 'warn' = 'info'): void {
		const timestamp = new Date().toISOString()
		const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`
		
		console.log(message)
		fs.appendFileSync(this.logFile, logMessage + '\n')
	}

	private async createBackup(): Promise<void> {
		if (!this.options.backup) return

		this.log('📦 Создание резервной копии MongoDB...')
		
		try {
			const backupDir = path.join(__dirname, '../backups', new Date().toISOString().split('T')[0])
			if (!fs.existsSync(backupDir)) {
				fs.mkdirSync(backupDir, { recursive: true })
			}

			const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/beton-crm'
			const command = `mongodump --uri="${mongoUri}" --out="${backupDir}"`
			
			await execAsync(command)
			this.log(`✅ Резервная копия создана: ${backupDir}`)
		} catch (error) {
			this.log(`❌ Ошибка создания резервной копии: ${error}`, 'error')
			throw error
		}
	}

	private async exportFromMongoDB(): Promise<string> {
		if (this.options.skipExport && this.options.exportDir) {
			this.log(`⏭️  Пропуск экспорта, используется директория: ${this.options.exportDir}`)
			return this.options.exportDir
		}

		this.log('📤 Этап 1: Экспорт из MongoDB')
		
		const exporter = new MongoDBExporter()
		await exporter.exportAll()
		await exporter.validateExport()
		
		// Получение пути к экспортированным данным
		const exportSummaryPath = path.join(__dirname, '../data/export-summary.json')
		if (fs.existsSync(exportSummaryPath)) {
			const summary = JSON.parse(fs.readFileSync(exportSummaryPath, 'utf-8'))
			this.exportDir = summary.exportDir
		}

		return this.exportDir
	}

	private async transformData(exportDir: string): Promise<string> {
		if (this.options.skipTransform && this.options.transformDir) {
			this.log(`⏭️  Пропуск трансформации, используется директория: ${this.options.transformDir}`)
			return this.options.transformDir
		}

		this.log('🔄 Этап 2: Трансформация данных')
		
		const transformer = new DataTransformer(exportDir)
		await transformer.transformAll()
		transformer.validateTransform()
		
		// Получение пути к трансформированным данным
		const transformSummaryPath = path.join(exportDir, '../transform-summary.json')
		if (fs.existsSync(transformSummaryPath)) {
			const summary = JSON.parse(fs.readFileSync(transformSummaryPath, 'utf-8'))
			this.transformDir = summary.targetDir
		}

		return this.transformDir
	}

	private async importToPostgreSQL(transformDir: string): Promise<void> {
		if (this.options.skipImport) {
			this.log('⏭️  Пропуск импорта в PostgreSQL')
			return
		}

		if (this.options.dryRun) {
			this.log('🔍 Режим DRY RUN - импорт не выполняется')
			return
		}

		this.log('📥 Этап 3: Импорт в PostgreSQL')
		
		const importer = new PostgreSQLImporter(transformDir)
		await importer.importAll()
		await importer.validateImport()
	}

	private async generateReport(): Promise<void> {
		this.log('\n📊 Генерация отчета о миграции...')
		
		const report = {
			migrationDate: new Date().toISOString(),
			options: this.options,
			stages: {
				export: {
					completed: !this.options.skipExport,
					directory: this.exportDir,
				},
				transform: {
					completed: !this.options.skipTransform,
					directory: this.transformDir,
				},
				import: {
					completed: !this.options.skipImport && !this.options.dryRun,
				},
			},
			logFile: this.logFile,
		}

		const reportPath = path.join(__dirname, '../reports', `migration-report-${Date.now()}.json`)
		const reportDir = path.dirname(reportPath)
		
		if (!fs.existsSync(reportDir)) {
			fs.mkdirSync(reportDir, { recursive: true })
		}

		fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
		this.log(`✅ Отчет сохранен: ${reportPath}`)
	}

	async run(): Promise<void> {
		this.log('🚀 Начало миграции MongoDB -> PostgreSQL')
		this.log(`📋 Опции: ${JSON.stringify(this.options)}`)
		
		try {
			// Создание резервной копии
			await this.createBackup()

			// Экспорт из MongoDB
			const exportDir = await this.exportFromMongoDB()
			
			// Трансформация данных
			const transformDir = await this.transformData(exportDir)
			
			// Импорт в PostgreSQL
			await this.importToPostgreSQL(transformDir)
			
			// Генерация отчета
			await this.generateReport()

			this.log('\n✅ Миграция завершена успешно!')
			this.log(`📄 Лог сохранен: ${this.logFile}`)
			
		} catch (error) {
			this.log(`\n❌ Критическая ошибка миграции: ${error}`, 'error')
			throw error
		}
	}
}

// CLI интерфейс
if (require.main === module) {
	const args = process.argv.slice(2)
	const options: MigrationOptions = {}

	// Парсинг аргументов командной строки
	for (let i = 0; i < args.length; i++) {
		switch (args[i]) {
			case '--skip-export':
				options.skipExport = true
				break
			case '--skip-transform':
				options.skipTransform = true
				break
			case '--skip-import':
				options.skipImport = true
				break
			case '--export-dir':
				options.exportDir = args[++i]
				break
			case '--transform-dir':
				options.transformDir = args[++i]
				break
			case '--dry-run':
				options.dryRun = true
				break
			case '--backup':
				options.backup = true
				break
			case '--help':
				console.log(`
Миграция данных из MongoDB в PostgreSQL

Использование:
  ts-node migrate-all.ts [опции]

Опции:
  --skip-export      Пропустить этап экспорта из MongoDB
  --skip-transform   Пропустить этап трансформации данных
  --skip-import      Пропустить этап импорта в PostgreSQL
  --export-dir       Путь к директории с экспортированными данными
  --transform-dir    Путь к директории с трансформированными данными
  --dry-run          Выполнить все этапы кроме реального импорта
  --backup           Создать резервную копию MongoDB перед миграцией
  --help             Показать эту справку

Примеры:
  # Полная миграция с резервной копией
  ts-node migrate-all.ts --backup

  # Только экспорт и трансформация
  ts-node migrate-all.ts --skip-import

  # Импорт ранее трансформированных данных
  ts-node migrate-all.ts --skip-export --skip-transform --transform-dir /path/to/data
				`)
				process.exit(0)
		}
	}

	const orchestrator = new MigrationOrchestrator(options)
	
	orchestrator.run()
		.then(() => {
			console.log('\n🎉 Миграция завершена!')
			process.exit(0)
		})
		.catch(error => {
			console.error('\n💥 Миграция завершена с ошибкой:', error)
			process.exit(1)
		})
}

export default MigrationOrchestrator