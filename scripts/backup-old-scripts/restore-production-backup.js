const { MongoClient } = require('mongodb')
const fs = require('fs')

async function restoreProductionBackup() {
	const backupFile = 'backup-production-fields-1750259112502.json'

	console.log('=== ВОССТАНОВЛЕНИЕ ПРОДАКШН БАЗЫ ИЗ РЕЗЕРВНОЙ КОПИИ ===\n')

	// Проверяем наличие файла
	if (!fs.existsSync(backupFile)) {
		console.error(`❌ Файл резервной копии не найден: ${backupFile}`)
		return
	}

	const client = new MongoClient('mongodb://localhost:27017')

	try {
		await client.connect()
		console.log('✅ Подключение к продакшн базе успешно')

		const db = client.db('beton-crm-production')

		// Загружаем резервную копию
		console.log('📖 Загружаем резервную копию...')
		const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'))

		console.log(`Найдено в резервной копии:`)
		console.log(`- Форм: ${backupData.forms?.length || 0}`)
		console.log(`- Полей: ${backupData.fields?.length || 0}`)
		console.log(`- Заявок: ${backupData.submissions?.length || 0}`)

		// Создаем новую резервную копию текущего состояния
		console.log('\n💾 Создаем резервную копию текущего состояния...')
		const currentBackup = {
			timestamp: new Date(),
			note: 'Состояние перед восстановлением',
			fields: await db.collection('formfields').find({}).toArray(),
			forms: await db.collection('forms').find({}).toArray(),
		}

		const currentBackupFile = `current-state-backup-${Date.now()}.json`
		fs.writeFileSync(currentBackupFile, JSON.stringify(currentBackup, null, 2))
		console.log(`✅ Текущее состояние сохранено в: ${currentBackupFile}`)

		// Очищаем текущие коллекции
		console.log('\n🗑️  Очищаем текущие коллекции...')
		await db.collection('formfields').deleteMany({})
		console.log('✅ Коллекция formfields очищена')

		await db.collection('forms').deleteMany({})
		console.log('✅ Коллекция forms очищена')

		// Восстанавливаем формы
		if (backupData.forms && backupData.forms.length > 0) {
			console.log('\n📝 Восстанавливаем формы...')
			await db.collection('forms').insertMany(backupData.forms)
			console.log(`✅ Восстановлено форм: ${backupData.forms.length}`)
		}

		// Восстанавливаем поля
		if (backupData.fields && backupData.fields.length > 0) {
			console.log('\n🔧 Восстанавливаем поля...')
			await db.collection('formfields').insertMany(backupData.fields)
			console.log(`✅ Восстановлено полей: ${backupData.fields.length}`)
		}

		// Проверяем результат
		console.log('\n🔍 Проверяем результат восстановления...')
		const restoredForms = await db.collection('forms').countDocuments()
		const restoredFields = await db.collection('formfields').countDocuments()

		console.log(`✅ Восстановлено:`)
		console.log(`- Форм: ${restoredForms}`)
		console.log(`- Полей: ${restoredFields}`)

		console.log('\n🎉 Восстановление завершено успешно!')
		console.log('\nРекомендации:')
		console.log('1. Перезапустите сервер: pm2 restart all')
		console.log('2. Проверьте форму в админке')
		console.log('3. Убедитесь, что все работает корректно')
	} catch (error) {
		console.error('❌ Ошибка при восстановлении:', error)
	} finally {
		await client.close()
	}
}

restoreProductionBackup().catch(console.error)
