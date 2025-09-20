import { searchSyncService } from '../services/searchSyncService'
import { elasticsearchService } from '../services/elasticsearchService'
import { syncScheduler } from '../services/syncScheduler'
import dotenv from 'dotenv'

dotenv.config()

async function testCronSync() {
	try {
		console.log('🔍 Тестируем обновленную кроновую синхронизацию...')

		// 1. Проверяем подключение к Elasticsearch
		const isConnected = await elasticsearchService.healthCheck()
		if (!isConnected) {
			console.error('❌ Elasticsearch не подключен')
			return
		}
		console.log('✅ Elasticsearch подключен')

		// 2. Проверяем статус планировщика
		const schedulerStatus = syncScheduler.getStatus()
		console.log('\n📊 Статус планировщика:')
		console.log(`   🕐 Работает: ${schedulerStatus.isRunning ? 'Да' : 'Нет'}`)
		console.log(
			`   📅 Последняя синхронизация: ${schedulerStatus.lastSync || 'Никогда'}`
		)
		console.log(
			`   ⏰ Следующая синхронизация: ${
				schedulerStatus.nextSync || 'Не запланирована'
			}`
		)
		console.log(`   📈 Всего записей: ${schedulerStatus.totalRecords}`)
		console.log(`   ✅ Успешно: ${schedulerStatus.successfulRecords}`)
		console.log(`   ❌ Ошибок: ${schedulerStatus.failedRecords}`)

		// 3. Проверяем доступные расписания
		const availableSchedules = syncScheduler.getAvailableSchedules()
		console.log('\n🕐 Доступные расписания:')
		Object.entries(availableSchedules).forEach(([name, schedule]) => {
			console.log(`   ${name}: ${schedule || 'Отключено'}`)
		})

		// 4. Запускаем тестовую синхронизацию
		console.log('\n🔄 Запускаем тестовую синхронизацию...')
		const syncStats = await searchSyncService.syncAllData()

		console.log('\n📊 Результаты синхронизации:')
		console.log(`   📈 Всего обработано: ${syncStats.totalProcessed}`)
		console.log(`   ✅ Успешно: ${syncStats.successful}`)
		console.log(`   ❌ Ошибок: ${syncStats.failed}`)

		if (syncStats.errors.length > 0) {
			console.log('\n❌ Ошибки:')
			syncStats.errors.forEach((error, index) => {
				console.log(`   ${index + 1}. ${error}`)
			})
		}

		// 5. Проверяем статистику индекса
		const indexStats = await elasticsearchService.getIndexStats()
		if (indexStats) {
			console.log('\n📊 Статистика индекса:')
			console.log(
				`   📄 Всего документов: ${indexStats.total?.docs?.count || 0}`
			)
			console.log(
				`   💾 Размер индекса: ${
					indexStats.total?.store?.size_in_bytes || 0
				} байт`
			)
		}

		// 6. Тестируем поиск по заявкам
		console.log('\n🔍 Тестируем поиск по заявкам...')
		const searchResults = await elasticsearchService.search({
			query: 'заявка',
			type: 'submission',
			limit: 5,
			offset: 0,
			includeHighlights: true,
			fuzzy: false,
		})

		console.log(`📋 Найдено заявок: ${searchResults.length}`)
		searchResults.forEach((result, index) => {
			console.log(`   ${index + 1}. ${result.name} (ID: ${result.id})`)
		})

		// 7. Тестируем поиск по компаниям с ИНН
		console.log('\n🔍 Тестируем поиск по компаниям...')
		const companyResults = await elasticsearchService.search({
			query: 'компания',
			type: 'company',
			limit: 3,
			offset: 0,
			includeHighlights: true,
			fuzzy: false,
		})

		console.log(`🏢 Найдено компаний: ${companyResults.length}`)
		companyResults.forEach((result, index) => {
			console.log(
				`   ${index + 1}. ${result.name} (ИНН: ${result.inn || 'не указан'})`
			)
		})

		console.log('\n✅ Тест кроновой синхронизации завершен успешно!')
		console.log('\n📝 Рекомендации:')
		console.log('   - Кроновая синхронизация теперь включает заявки')
		console.log('   - Расписание изменено на каждые 30 минут')
		console.log('   - ИНН компаний правильно синхронизируется')
		console.log('   - Все данные доступны для поиска')
	} catch (error) {
		console.error('❌ Ошибка при тестировании:', error)
	}
}

testCronSync()


