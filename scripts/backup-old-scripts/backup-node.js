#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { MongoClient } = require('mongodb')
const archiver = require('archiver')

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

async function createBackup(environment) {
	const env = config[environment]
	if (!env) {
		throw new Error(`Unknown environment: ${environment}`)
	}

	// Creating backup for environment

	// Создаем папку для бэкапов
	if (!fs.existsSync(env.backupDir)) {
		fs.mkdirSync(env.backupDir, { recursive: true })
	}

	const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
	const backupPath = path.join(env.backupDir, timestamp)
	fs.mkdirSync(backupPath, { recursive: true })

	// Backup folder path

	try {
		// 1. Создание бэкапа базы данных
		await createDatabaseBackup(
			env.dbUrl,
			env.dbName,
			path.join(backupPath, 'db')
		)

		// 2. Создание архива файлов приложения
		await createFilesBackup(env.appDir, path.join(backupPath, 'app.tar.gz'))

		// Backup successfully created
		return backupPath
	} catch (error) {
		// Удаляем неполный бэкап в случае ошибки
		if (fs.existsSync(backupPath)) {
			fs.rmSync(backupPath, { recursive: true, force: true })
		}
		throw error
	}
}

async function createDatabaseBackup(dbUrl, dbName, outputPath) {
	const client = new MongoClient(dbUrl)

	try {
		await client.connect()
		const db = client.db(dbName)
		const collections = await db.listCollections().toArray()

		if (!fs.existsSync(outputPath)) {
			fs.mkdirSync(outputPath, { recursive: true })
		}

		for (const collectionInfo of collections) {
			const collectionName = collectionInfo.name
			// Exporting collection

			const collection = db.collection(collectionName)
			const documents = await collection.find({}).toArray()

			const filePath = path.join(outputPath, `${collectionName}.json`)
			fs.writeFileSync(filePath, JSON.stringify(documents, null, 2))
		}
	} finally {
		await client.close()
	}
}

async function createFilesBackup(sourceDir, outputPath) {
	return new Promise((resolve, reject) => {
		const output = fs.createWriteStream(outputPath)
		const archive = archiver('tar', { gzip: true })

		output.on('close', () => {
			// Archive created
			resolve()
		})

		archive.on('error', reject)
		archive.pipe(output)

		// Добавляем файлы, исключая ненужные папки
		archive.glob('**/*', {
			cwd: sourceDir,
			ignore: ['node_modules/**', '.git/**', 'backups/**', '*.log', '.env'],
		})

		archive.finalize()
	})
}

// Запуск скрипта
if (require.main === module) {
	const environment = process.argv[2] || 'local'

	createBackup(environment)
		.then(backupPath => {
			// Backup completed
			process.exit(0)
		})
		.catch(error => {
			// Error creating backup
			process.exit(1)
		})
}

module.exports = { createBackup }
