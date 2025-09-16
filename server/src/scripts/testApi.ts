import axios from 'axios'

async function testApi() {
	try {
		console.log('🔍 Тестируем API поиска компаний...')

		const response = await axios.post(
			'http://localhost:5001/api/search/companies',
			{
				query: 'Казначейство России',
				limit: 1,
			}
		)

		console.log('📊 Результат API:')
		console.log(JSON.stringify(response.data, null, 2))
	} catch (error) {
		console.error('❌ Ошибка:', error)
	}
}

testApi()
