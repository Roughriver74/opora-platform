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
		console.log('🚀 Начинаем миграцию базы данных...')

		// Подключаемся к старой базе
		console.log('📡 Подключение к старой базе данных...')
		oldClient = new MongoClient(OLD_DB_URI)
		await oldClient.connect()
		const oldDb = oldClient.db()

		// Подключаемся к новой базе
		console.log('📡 Подключение к новой базе данных...')
		newClient = new MongoClient(NEW_DB_URI)
		await newClient.connect()
		const newDb = newClient.db()

		// Проверяем, есть ли уже данные в новой базе
		const collections = await newDb.listCollections().toArray()
		if (collections.length > 0) {
			console.log('⚠️  Новая база данных не пуста. Хотите продолжить? (y/N)')
			const readline = require('readline').createInterface({
				input: process.stdin,
				output: process.stdout,
			})

			const answer = await new Promise(resolve => {
				readline.question('', resolve)
			})
			readline.close()

			if (answer.toLowerCase() !== 'y') {
				console.log('❌ Миграция отменена пользователем')
				return
			}
		}

		// Мигрируем каждую коллекцию
		for (const collectionName of COLLECTIONS_TO_MIGRATE) {
			console.log(`📦 Миграция коллекции: ${collectionName}`)

			// Проверяем, существует ли коллекция в старой базе
			const oldCollectionExists = await oldDb
				.listCollections({ name: collectionName })
				.hasNext()
			if (!oldCollectionExists) {
				console.log(
					`⚠️  Коллекция ${collectionName} не найдена в старой базе, пропускаем`
				)
				continue
			}

			// Получаем данные из старой коллекции
			const oldCollection = oldDb.collection(collectionName)
			const documents = await oldCollection.find({}).toArray()

			if (documents.length === 0) {
				console.log(`📭 Коллекция ${collectionName} пуста, пропускаем`)
				continue
			}

			// Записываем в новую коллекцию
			const newCollection = newDb.collection(collectionName)

			// Удаляем существующие данные (если есть)
			await newCollection.deleteMany({})

			// Вставляем новые данные
			await newCollection.insertMany(documents)

			console.log(
				`✅ Перенесено ${documents.length} документов в ${collectionName}`
			)
		}

		console.log('🎉 Миграция завершена успешно!')
		console.log('📋 Сводка:')

		// Показываем статистику по коллекциям
		for (const collectionName of COLLECTIONS_TO_MIGRATE) {
			try {
				const newCollection = newDb.collection(collectionName)
				const count = await newCollection.countDocuments()
				console.log(`   ${collectionName}: ${count} документов`)
			} catch (error) {
				console.log(`   ${collectionName}: ошибка подсчета`)
			}
		}

		console.log('\n⚠️  ВАЖНО: После успешной миграции:')
		console.log('1. Обновите .env файл на сервере с новой MONGODB_URI')
		console.log('2. Перезапустите приложение')
		console.log('3. Проверьте работоспособность')
		console.log('4. Только после этого можно удалить старую базу beton-crm')
	} catch (error) {
		console.error('❌ Ошибка при миграции:', error)
		process.exit(1)
	} finally {
		// Закрываем соединения
		if (oldClient) {
			await oldClient.close()
			console.log('🔌 Соединение со старой базой закрыто')
		}
		if (newClient) {
			await newClient.close()
			console.log('🔌 Соединение с новой базой закрыто')
		}
	}
}

// Проверяем, что скрипт запускается на сервере
if (process.env.NODE_ENV !== 'production') {
	console.log(
		'⚠️  ВНИМАНИЕ: Этот скрипт должен запускаться только на продакшн сервере!'
	)
	console.log('Для запуска установите NODE_ENV=production')
	process.exit(1)
}

// Запускаем миграцию
migrateDatabase().catch(console.error)
