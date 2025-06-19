const { MongoClient } = require('mongodb')

async function checkDatabases() {
	const client = new MongoClient('mongodb://localhost:27017')

	try {
		await client.connect()
		console.log('Подключение к MongoDB успешно')

		// Получаем список всех баз данных
		const adminDb = client.db().admin()
		const databases = await adminDb.listDatabases()

		console.log('Доступные базы данных:')
		for (const db of databases.databases) {
			console.log(
				`\n📄 База данных: ${db.name} (размер: ${(
					db.sizeOnDisk /
					1024 /
					1024
				).toFixed(2)} MB)`
			)

			if (db.name.includes('beton') || db.name.includes('crm')) {
				const database = client.db(db.name)
				const collections = await database.listCollections().toArray()

				console.log('  Коллекции:')
				for (const collection of collections) {
					const count = await database
						.collection(collection.name)
						.countDocuments()
					console.log(`    - ${collection.name}: ${count} документов`)
				}
			}
		}

		// Проверяем конкретные базы
		const testBases = [
			'beton-crm-production',
			'beton-crm',
			'beton-crm-dev',
			'betoncrm',
		]

		console.log('\n\nДетальная проверка целевых баз:')
		for (const baseName of testBases) {
			try {
				const db = client.db(baseName)
				const collections = await db.listCollections().toArray()

				if (collections.length > 0) {
					console.log(`\n✅ База "${baseName}" найдена:`)

					for (const collection of collections) {
						const count = await db.collection(collection.name).countDocuments()
						console.log(`  - ${collection.name}: ${count} документов`)

						// Для важных коллекций показываем примеры
						if (
							['forms', 'formfields'].includes(collection.name) &&
							count > 0
						) {
							const sample = await db.collection(collection.name).findOne()
							console.log(`    Пример документа:`, sample)
						}
					}
				}
			} catch (error) {
				console.log(`❌ База "${baseName}" недоступна: ${error.message}`)
			}
		}
	} catch (error) {
		console.error('Ошибка:', error)
	} finally {
		await client.close()
	}
}

checkDatabases().catch(console.error)
