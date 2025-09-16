import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const webhookUrl = process.env.BITRIX24_WEBHOOK_URL

async function testRequisitesCount() {
	try {
		console.log('🔍 Тестируем количество реквизитов...')

		// Получаем все реквизиты компаний
		const response = await axios.post(`${webhookUrl}crm.requisite.list`, {
			filter: {
				ENTITY_TYPE_ID: 4, // 4 = Company
			},
			select: [
				'ID',
				'ENTITY_TYPE_ID',
				'ENTITY_ID',
				'NAME',
				'RQ_INN',
				'RQ_KPP',
				'RQ_OGRN',
				'RQ_OKPO',
				'RQ_OKVED',
				'ACTIVE',
			],
			start: 0,
			limit: 10000, // Большой лимит
		})

		const requisites = response.data?.result || []
		console.log(`📄 Всего реквизитов компаний: ${requisites.length}`)

		// Проверяем реквизиты для компании 9
		const company9Requisites = requisites.filter(r => r.ENTITY_ID === '9')
		console.log(`\n🏢 Реквизиты для компании 9: ${company9Requisites.length}`)

		company9Requisites.forEach((req, index) => {
			console.log(
				`   ${index + 1}. ${req.NAME || 'Без названия'} (ID: ${req.ID})`
			)
			console.log(`      🆔 ИНН: "${req.RQ_INN || 'не указан'}"`)
			console.log(`      ✅ Активен: ${req.ACTIVE}`)
		})

		// Статистика по ИНН
		const requisitesWithInn = requisites.filter(r => r.RQ_INN)
		console.log(`\n📈 Статистика:`)
		console.log(`   🆔 Реквизитов с ИНН: ${requisitesWithInn.length}`)
		console.log(
			`   📊 Процент с ИНН: ${(
				(requisitesWithInn.length / requisites.length) *
				100
			).toFixed(1)}%`
		)
	} catch (error) {
		console.error('❌ Ошибка:', error)
	}
}

testRequisitesCount()
