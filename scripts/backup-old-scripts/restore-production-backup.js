const { MongoClient } = require('mongodb')
const fs = require('fs')

async function restoreProductionBackup() {
	const backupFile = 'backup-production-fields-1750259112502.json'


	// Проверяем наличие файла
	if (!fs.existsSync(backupFile)) {
		return
	}

	const client = new MongoClient('mongodb://localhost:27017')

	try {
		await client.connect()

		const db = client.db('beton-crm-production')

		// Загружаем резервную копию
		const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'))


		// Создаем новую резервную копию текущего состояния
		const currentBackup = {
			timestamp: new Date(),
			note: 'Состояние перед восстановлением',
			fields: await db.collection('formfields').find({}).toArray(),
			forms: await db.collection('forms').find({}).toArray(),
		}

		const currentBackupFile = `current-state-backup-${Date.now()}.json`
		fs.writeFileSync(currentBackupFile, JSON.stringify(currentBackup, null, 2))

		// Очищаем текущие коллекции
		await db.collection('formfields').deleteMany({})

		await db.collection('forms').deleteMany({})

		// Восстанавливаем формы
		if (backupData.forms && backupData.forms.length > 0) {
			await db.collection('forms').insertMany(backupData.forms)
		}

		// Восстанавливаем поля
		if (backupData.fields && backupData.fields.length > 0) {
			await db.collection('formfields').insertMany(backupData.fields)
		}

		// Проверяем результат
		const restoredForms = await db.collection('forms').countDocuments()
		const restoredFields = await db.collection('formfields').countDocuments()


	} catch (error) {
	} finally {
		await client.close()
	}
}

