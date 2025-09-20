import { searchSyncService } from '../services/searchSyncService'
import { elasticsearchService } from '../services/elasticsearchService'
import bitrix24Service from '../services/bitrix24Service'
import dotenv from 'dotenv'

dotenv.config()

async function testInnSync() {
	try {
		console.log('🔍 Тестируем синхронизацию ИНН...')

		// 1. Проверяем подключение к Elasticsearch
		const isConnected = await elasticsearchService.healthCheck()
		if (!isConnected) {
			console.error('❌ Elasticsearch не подключен')
			return
		}
		console.log('✅ Elasticsearch подключен')

		// 2. Получаем компании с реквизитами из Bitrix24
		console.log('📊 Получаем компании с реквизитами из Bitrix24...')
		const companies = await bitrix24Service.getAllCompaniesWithRequisites()
		console.log(`Найдено компаний: ${companies.length}`)

		// 3. Проверяем компании с ИНН
		const companiesWithInn = companies.filter(c => c.RQ_INN && c.RQ_INN.trim())
		console.log(`\n📈 Статистика:`)
		console.log(`   🆔 Компаний с ИНН: ${companiesWithInn.length}`)
		console.log(
			`   📊 Процент с ИНН: ${(
				(companiesWithInn.length / companies.length) *
				100
			).toFixed(1)}%`
		)

		// 4. Показываем примеры компаний с ИНН
		console.log(`\n🏢 Примеры компаний с ИНН:`)
		companiesWithInn.slice(0, 5).forEach((company, index) => {
			console.log(
				`   ${index + 1}. ${company.TITLE} (ID: ${company.ID}) - ИНН: ${
					company.RQ_INN
				}`
			)
		})

		// 5. Синхронизируем компании
		console.log(`\n🔄 Синхронизируем компании...`)
		const syncStats = await searchSyncService.syncCompanies()
		console.log(`✅ Синхронизация завершена:`)
		console.log(`   📊 Обработано: ${syncStats.totalProcessed}`)
		console.log(`   ✅ Успешно: ${syncStats.successful}`)
		console.log(`   ❌ Ошибок: ${syncStats.failed}`)

		// 6. Тестируем поиск по ИНН
		if (companiesWithInn.length > 0) {
			const testInn = companiesWithInn[0].RQ_INN
			console.log(`\n🔍 Тестируем поиск по ИНН: ${testInn}`)

			const searchResults = await elasticsearchService.search({
				query: testInn,
				type: 'company',
				limit: 10,
				offset: 0,
				includeHighlights: true,
				fuzzy: false,
			})

			console.log(`📋 Результаты поиска:`)
			searchResults.forEach((result, index) => {
				console.log(
					`   ${index + 1}. ${result.name} (ID: ${result.id}) - ИНН: ${
						result.inn
					}`
				)
			})
		}

		console.log('\n✅ Тест завершен успешно!')
	} catch (error) {
		console.error('❌ Ошибка при тестировании:', error)
	}
}

testInnSync()


