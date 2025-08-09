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
		console.log(`📊 Миграция: ${OLD_DB_URI} → ${NEW_DB_URI}`)

		// Подключаемся к старой базе
		console.log('📡 Подключение к старой базе данных...')
		oldClient = new MongoClient(OLD_DB_URI)
		await oldClient.connect()
		const oldDb = oldClient.db()

		// Проверяем, есть ли данные в старой базе
		const oldCollections = await oldDb.listCollections().toArray()
		if (oldCollections.length === 0) {
			console.log('📭 Старая база данных пуста, миграция не требуется')
			return
		}

		// Подключаемся к новой базе
		console.log('📡 Подключение к новой базе данных...')
		newClient = new MongoClient(NEW_DB_URI)
		await newClient.connect()
		const newDb = newClient.db()

		// Проверяем, есть ли уже данные в новой базе
		const newCollections = await newDb.listCollections().toArray()
		if (newCollections.length > 0) {
			// Показываем информацию о существующих данных
			console.log('⚠️  Новая база данных не пуста:')
			for (const collection of newCollections) {
				try {
					const count = await newDb.collection(collection.name).countDocuments()
					console.log(`   - ${collection.name}: ${count} документов`)
				} catch (error) {
					console.log(`   - ${collection.name}: ошибка подсчета`)
				}
			}

			console.log('\n❓ Хотите продолжить и перезаписать данные? (y/N)')

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
				console.log('Автоматический режим: продолжаем миграцию')
			}

			if (answer.toLowerCase() !== 'y') {
				console.log('❌ Миграция отменена пользователем')
				return
			}
		}

		let totalMigrated = 0

		// Мигрируем каждую коллекцию
		for (const collectionName of COLLECTIONS_TO_MIGRATE) {
			console.log(`\n📦 Миграция коллекции: ${collectionName}`)

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
			totalMigrated += documents.length
		}

		console.log('\n🎉 Миграция завершена успешно!')
		console.log(`📊 Всего перенесено: ${totalMigrated} документов`)
		console.log('\n📋 Сводка по новой базе:')

		// Показываем статистику по коллекциям
		for (const collectionName of COLLECTIONS_TO_MIGRATE) {
			try {
				const newCollection = newDb.collection(collectionName)
				const count = await newCollection.countDocuments()
				if (count > 0) {
					console.log(`   ✅ ${collectionName}: ${count} документов`)
				}
			} catch (error) {
				console.log(`   ❌ ${collectionName}: ошибка подсчета`)
			}
		}

		console.log('\n⚠️  ВАЖНО: После успешной миграции:')
		console.log('1. Убедитесь, что приложение использует новую базу данных')
		console.log('2. Проверьте работоспособность всех функций')
		console.log(
			'3. Только после полной проверки можно удалить старую базу beton-crm'
		)
		console.log(
			'4. Команда для удаления старой базы: mongosh beton-crm --eval "db.dropDatabase()"'
		)
	} catch (error) {
		console.error('❌ Ошибка при миграции:', error)
		process.exit(1)
	} finally {
		// Закрываем соединения
		if (oldClient) {
			await oldClient.close()
			console.log('\n🔌 Соединение со старой базой закрыто')
		}
		if (newClient) {
			await newClient.close()
			console.log('🔌 Соединение с новой базой закрыто')
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
		console.error('❌ Ошибка подключения к MongoDB:', error.message)
		console.log('💡 Убедитесь, что MongoDB запущен: systemctl status mongod')
		return false
	}
}

// Основная функция
async function main() {
	console.log('🔍 Проверка подключения к MongoDB...')

	if (!(await checkMongoConnection())) {
		process.exit(1)
	}

	console.log('✅ MongoDB доступен\n')

	// Запускаем миграцию
	await migrateDatabase()
}

main().catch(console.error)
