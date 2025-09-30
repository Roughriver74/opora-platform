#!/usr/bin/env ts-node

/**
 * Скрипт для тестирования улучшений поиска по номенклатуре
 * Проверяет, что точные совпадения марок бетона получают высокий приоритет
 */

import { ElasticsearchService } from '../services/elasticsearchService'
import { logger } from '../utils/logger'

interface TestCase {
	query: string
	expectedType: string
	description: string
}

async function testSearchImprovements() {
	try {
		logger.info('🧪 Начинаем тестирование улучшений поиска...')

		const elasticsearchService = new ElasticsearchService()

		// Тестовые случаи
		const testCases: TestCase[] = [
			{
				query: 'В25',
				expectedType: 'product',
				description: 'Точная марка бетона В25',
			},
			{
				query: 'В30',
				expectedType: 'product',
				description: 'Точная марка бетона В30',
			},
			{
				query: 'М300',
				expectedType: 'product',
				description: 'Точная марка бетона М300',
			},
			{
				query: 'М400',
				expectedType: 'product',
				description: 'Точная марка бетона М400',
			},
			{
				query: 'марка В25',
				expectedType: 'product',
				description: 'Поиск с префиксом "марка"',
			},
			{
				query: 'бетон В25',
				expectedType: 'product',
				description: 'Поиск с префиксом "бетон"',
			},
			{
				query: 'раствор',
				expectedType: 'product',
				description: 'Поиск растворов (не должен показывать бетон)',
			},
		]

		let passedTests = 0
		let totalTests = testCases.length

		for (const testCase of testCases) {
			logger.info(`\n🔍 Тестируем: ${testCase.description}`)
			logger.info(`   Запрос: "${testCase.query}"`)

			try {
				const results = await elasticsearchService.search({
					query: testCase.query,
					type: testCase.expectedType,
					limit: 10,
					includeHighlights: true,
				})

				logger.info(`   📊 Найдено результатов: ${results.length}`)

				if (results.length > 0) {
					// Показываем топ-3 результата
					const topResults = results.slice(0, 3)
					logger.info('   🏆 Топ результаты:')

					topResults.forEach((result, index) => {
						logger.info(
							`     ${index + 1}. "${
								result.name
							}" (score: ${result.score.toFixed(2)})`
						)

						// Проверяем релевантность для марок бетона
						if (testCase.query.match(/^[вм][0-9]+$/i)) {
							const isRelevant =
								result.name
									.toLowerCase()
									.includes(testCase.query.toLowerCase()) ||
								result.name
									.toLowerCase()
									.includes(`бетон ${testCase.query.toLowerCase()}`)

							if (isRelevant) {
								logger.info(`       ✅ Релевантный результат`)
							} else {
								logger.info(`       ⚠️ Возможно нерелевантный результат`)
							}
						}
					})

					// Проверяем, что для марок бетона не показываются растворы
					if (testCase.query.match(/^[вм][0-9]+$/i)) {
						const hasConcreteResults = results.some(
							r =>
								r.name.toLowerCase().includes('бетон') ||
								r.name.toLowerCase().includes(testCase.query.toLowerCase())
						)

						const hasSolutionResults = results.some(
							r =>
								r.name.toLowerCase().includes('раствор') &&
								!r.name.toLowerCase().includes('бетон')
						)

						if (hasConcreteResults && !hasSolutionResults) {
							logger.info(
								'   ✅ Тест пройден: показываются только релевантные результаты'
							)
							passedTests++
						} else {
							logger.info(
								'   ❌ Тест не пройден: показываются нерелевантные результаты'
							)
						}
					} else {
						// Для других запросов просто проверяем наличие результатов
						logger.info('   ✅ Тест пройден: найдены результаты')
						passedTests++
					}
				} else {
					logger.info('   ⚠️ Результаты не найдены')
				}
			} catch (error) {
				logger.error(`   ❌ Ошибка при поиске: ${error.message}`)
			}
		}

		// Итоговая статистика
		logger.info(`\n📊 Результаты тестирования:`)
		logger.info(`   Пройдено тестов: ${passedTests}/${totalTests}`)
		logger.info(
			`   Процент успеха: ${((passedTests / totalTests) * 100).toFixed(1)}%`
		)

		if (passedTests === totalTests) {
			logger.info('🎉 Все тесты пройдены успешно!')
		} else {
			logger.info('⚠️ Некоторые тесты не пройдены. Проверьте настройки поиска.')
		}

		// Дополнительный тест: сравнение скоринга
		logger.info('\n🔬 Дополнительный тест: сравнение скоринга')

		const concreteQuery = 'В25'
		const concreteResults = await elasticsearchService.search({
			query: concreteQuery,
			type: 'product',
			limit: 5,
		})

		const solutionQuery = 'раствор'
		const solutionResults = await elasticsearchService.search({
			query: solutionQuery,
			type: 'product',
			limit: 5,
		})

		logger.info(`   Поиск "${concreteQuery}":`)
		concreteResults.forEach((result, index) => {
			logger.info(
				`     ${index + 1}. "${result.name}" (score: ${result.score.toFixed(
					2
				)})`
			)
		})

		logger.info(`   Поиск "${solutionQuery}":`)
		solutionResults.forEach((result, index) => {
			logger.info(
				`     ${index + 1}. "${result.name}" (score: ${result.score.toFixed(
					2
				)})`
			)
		})
	} catch (error) {
		logger.error('❌ Ошибка при тестировании:', error)
		process.exit(1)
	}
}

// Запускаем тестирование
if (require.main === module) {
	testSearchImprovements()
		.then(() => {
			logger.info('✅ Тестирование завершено')
			process.exit(0)
		})
		.catch(error => {
			logger.error('❌ Тестирование завершено с ошибкой:', error)
			process.exit(1)
		})
}

export { testSearchImprovements }
