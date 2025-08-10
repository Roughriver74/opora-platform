#!/usr/bin/env node

/**
 * Скрипт для миграции данных из beton-crm в beton-crm-production
 * ВНИМАНИЕ: Запускайте только на продакшн сервере!
 */

const { MongoClient } = require('mongodb')

const OLD_DB_URI = 'mongodb://localhost:27017/beton-crm'
const NEW_DB_URI = 'mongodb://localhost:27017/beton-crm-production'

const COLLECTIONS_TO_MIGRATE = [
	'users',
	'submissions',
	'formfields',
	'submissionhistories',
	'admintokens',
]

async function migrateDatabase() {
	let oldClient, newClient

	try {
		// Starting database migration

		// Подключаемся к старой базе
		oldClient = new MongoClient(OLD_DB_URI)
		await oldClient.connect()
		const oldDb = oldClient.db()

		// Проверяем, есть ли данные в старой базе
		const oldCollections = await oldDb.listCollections().toArray()
		if (oldCollections.length === 0) {
			return
		}

		// Подключаемся к новой базе
		newClient = new MongoClient(NEW_DB_URI)
		await newClient.connect()
		const newDb = newClient.db()

		// Проверяем, есть ли уже данные в новой базе
		const newCollections = await newDb.listCollections().toArray()
		if (newCollections.length > 0) {
			// Показываем информацию о существующих данных
			for (const collection of newCollections) {
				try {
					const count = await newDb.collection(collection.name).countDocuments()
				} catch (error) {
					// Error counting documents
				}
			}

			// Check if user wants to continue

			// Проверяем, есть ли автоматический ответ из pipe
			let answer
			if (process.stdin.isTTY) {
				const readline = require('readline').createInterface({
					input: process.stdin,
					output: process.stdout,
				})

				answer = await new Promise(resolve => {
					readline.question('', resolve)
				})
				readline.close()
			} else {
				// Автоматический режим (из pipe)
				answer = 'y'
			}

			if (answer.toLowerCase() !== 'y') {
				return
			}
		}

		let totalMigrated = 0

		// Мигрируем каждую коллекцию
		for (const collectionName of COLLECTIONS_TO_MIGRATE) {
			// Migrating collection

			// Проверяем, существует ли коллекция в старой базе
			const oldCollectionExists = await oldDb
				.listCollections({ name: collectionName })
				.hasNext()
			if (!oldCollectionExists) {
				continue
			}

			// Получаем данные из старой коллекции
			const oldCollection = oldDb.collection(collectionName)
			const documents = await oldCollection.find({}).toArray()

			if (documents.length === 0) {
				continue
			}

			// Записываем в новую коллекцию
			const newCollection = newDb.collection(collectionName)

			// Удаляем существующие данные (если есть)
			await newCollection.deleteMany({})

			// Вставляем новые данные
			await newCollection.insertMany(documents)

			// Documents migrated
			totalMigrated += documents.length
		}

		// Migration completed successfully

		// Показываем статистику по коллекциям
		for (const collectionName of COLLECTIONS_TO_MIGRATE) {
			try {
				const newCollection = newDb.collection(collectionName)
				const count = await newCollection.countDocuments()
				if (count > 0) {
					// Collection has documents
				}
			} catch (error) {
				// Error counting documents
			}
		}

		// Migration completed - follow post-migration steps
	} catch (error) {
		process.exit(1)
	} finally {
		// Закрываем соединения
		if (oldClient) {
			await oldClient.close()
		}
		if (newClient) {
			await newClient.close()
		}
	}
}

// Проверяем, что MongoDB доступен
async function checkMongoConnection() {
	try {
		const client = new MongoClient('mongodb://localhost:27017')
		await client.connect()
		await client.close()
		return true
	} catch (error) {
		// Error connecting to MongoDB
		return false
	}
}

// Основная функция
async function main() {
	// Checking MongoDB connection

	if (!(await checkMongoConnection())) {
		process.exit(1)
	}

	// MongoDB is available

	// Запускаем миграцию
	await migrateDatabase()
}

main().catch(() => {})
