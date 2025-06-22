#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { MongoClient } = require('mongodb')
const { exec } = require('child_process')
const { promisify } = require('util')

const execAsync = promisify(exec)

// Конфигурация
const config = {
	local: {
		dbName: 'beton-crm',
		dbUrl: 'mongodb://localhost:27017',
		backupDir: path.resolve(__dirname, '../backups'),
		appDir: path.resolve(__dirname, '..'),
	},
	production: {
		dbName: 'beton-crm-production',
		dbUrl: 'mongodb://localhost:27017',
		backupDir: '/var/www/beton-crm-backups',
		appDir: '/var/www/beton-crm',
	},
}

async function restoreBackup(environment, timestamp) {
	const env = config[environment]
	if (!env) {
		throw new Error(`Unknown environment: ${environment}`)
	}

	const backupPath = path.join(env.backupDir, timestamp)

	if (!fs.existsSync(backupPath)) {
		throw new Error(`Backup not found: ${backupPath}`)
	}

	console.log(`🔄 Восстановление из бэкапа: ${timestamp}`)
	console.log(`📁 Путь к бэкапу: ${backupPath}`)

	try {
		// 1. Восстановление базы данных
		console.log('🗄️  Восстановление базы данных...')
		await restoreDatabase(env.dbUrl, env.dbName, path.join(backupPath, 'db'))

		// 2. Восстановление файлов приложения
		console.log('📦 Восстановление файлов приложения...')
		await restoreFiles(path.join(backupPath, 'app.tar.gz'), env.appDir)

		console.log(`✅ Восстановление завершено успешно!`)
		return true
	} catch (error) {
		console.error(`❌ Ошибка восстановления:`, error.message)
		throw error
	}
}

async function restoreDatabase(dbUrl, dbName, dbBackupPath) {
	const client = new MongoClient(dbUrl)

	try {
		await client.connect()
		const db = client.db(dbName)

		// Получаем список JSON файлов в папке бэкапа
		const backupFiles = fs
			.readdirSync(dbBackupPath)
			.filter(file => file.endsWith('.json'))

		if (backupFiles.length === 0) {
			throw new Error('No backup files found in database backup directory')
		}

		for (const file of backupFiles) {
			const collectionName = path.basename(file, '.json')
			console.log(`   📋 Восстановление коллекции: ${collectionName}`)

			// Читаем данные из JSON файла
			const filePath = path.join(dbBackupPath, file)
			const jsonData = fs.readFileSync(filePath, 'utf8')
			const documents = JSON.parse(jsonData)

			if (documents && documents.length > 0) {
				// Удаляем существующую коллекцию
				try {
					await db.collection(collectionName).drop()
				} catch (err) {
					// Коллекция может не существовать, это нормально
				}

				// Вставляем данные
				await db.collection(collectionName).insertMany(documents)
				console.log(`      ✅ Восстановлено ${documents.length} документов`)
			} else {
				console.log(`      ⚠️  Коллекция ${collectionName} пуста`)
			}
		}
	} finally {
		await client.close()
	}
}

async function restoreFiles(archivePath, targetDir) {
	if (!fs.existsSync(archivePath)) {
		throw new Error(`Archive not found: ${archivePath}`)
	}

	// Создаем временную папку для распаковки
	const tempDir = path.join(path.dirname(archivePath), 'temp_restore')

	try {
		// Создаем временную папку
		if (fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true, force: true })
		}
		fs.mkdirSync(tempDir, { recursive: true })

		console.log(`   📦 Распаковка архива...`)
		// Распаковываем архив
		await execAsync(`tar -xzf "${archivePath}" -C "${tempDir}"`)

		console.log(`   🔄 Синхронизация файлов...`)
		// Синхронизируем файлы, исключая критически важные папки
		const excludeOptions = [
			'--exclude=node_modules/',
			'--exclude=.git/',
			'--exclude=backups/',
			'--exclude=*.log',
			'--exclude=.env',
		].join(' ')

		await execAsync(
			`rsync -a --delete ${excludeOptions} "${tempDir}/" "${targetDir}/"`
		)

		console.log(`   ✅ Файлы восстановлены`)
	} finally {
		// Удаляем временную папку
		if (fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true, force: true })
		}
	}
}

// Запуск скрипта
if (require.main === module) {
	const environment = process.argv[2] || 'local'
	const timestamp = process.argv[3]

	if (!timestamp) {
		console.error('❌ Укажите timestamp бэкапа для восстановления')
		console.log(
			'Использование: node restore-node.js [local|production] <timestamp>'
		)
		process.exit(1)
	}

	// Подтверждение от пользователя
	const readline = require('readline')
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	})

	rl.question(
		`⚠️  Вы уверены, что хотите восстановить систему из бэкапа '${timestamp}'?\nЭто действие ПЕРЕЗАПИШЕТ все текущие данные! (y/N): `,
		answer => {
			rl.close()

			if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
				restoreBackup(environment, timestamp)
					.then(() => {
						console.log(`🎉 Восстановление завершено: ${timestamp}`)
						process.exit(0)
					})
					.catch(error => {
						console.error('❌ Ошибка восстановления:', error.message)
						process.exit(1)
					})
			} else {
				console.log('🚫 Восстановление отменено')
				process.exit(0)
			}
		}
	)
}

module.exports = { restoreBackup }
