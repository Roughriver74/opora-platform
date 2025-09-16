import bitrix24Service from '../services/bitrix24Service'

async function testSync() {
	try {
		console.log('🔍 Тестируем синхронизацию...')

		// Тестируем получение компаний с реквизитами
		const companies = await bitrix24Service.getAllCompaniesWithRequisites()

		console.log(`📊 Всего компаний: ${companies.length}`)

		// Проверяем компанию 9 (ООО "РОМАШКА")
		const company9 = companies.find(c => c.ID === '9')
		if (company9) {
			console.log(`\n🏢 Компания 9: ${company9.TITLE}`)
			console.log(`   🆔 ИНН: "${company9.RQ_INN || 'не указан'}"`)
			console.log(
				`   👤 Ответственный: "${company9.ASSIGNED_BY_ID || 'не указан'}"`
			)
			console.log(`   📄 Реквизитов: ${company9.requisites?.length || 0}`)
		} else {
			console.log('❌ Компания 9 не найдена')
		}
	} catch (error) {
		console.error('❌ Ошибка:', error)
	}
}

testSync()
