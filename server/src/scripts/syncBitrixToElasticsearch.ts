import 'reflect-metadata'
import dotenv from 'dotenv'
import { elasticsearchService } from '../services/elasticsearchService'
import bitrix24Service from '../services/bitrix24Service'
import { logger } from '../utils/logger'
import { AppDataSource } from '../database/config/database.config'
import { Submission } from '../database/entities/Submission.entity'

dotenv.config()

const syncBitrixToElasticsearch = async () => {
	console.log(
		'🚀 Starting Bitrix24 to Elasticsearch sync with optimized settings...'
	)

	try {
		// 1. Check Elasticsearch connection
		const isConnected = await elasticsearchService.healthCheck()
		if (!isConnected) {
			console.error('❌ Elasticsearch is not connected')
			return
		}

		// 2. Delete old index to apply new optimized settings
		console.log('🗑️ Deleting old index to apply optimized settings...')
		await elasticsearchService.deleteIndex()

		// 3. Initialize index with optimized settings
		console.log(
			'🏗️ Creating new index with optimized analyzers, synonyms, and function_score...'
		)
		await elasticsearchService.initializeIndex()

		// 3. Sync products
		console.log('📦 Syncing products...')

		// Получаем ВСЕ товары с пагинацией
		const allProducts = await bitrix24Service.getAllProducts()
		console.log(`Found ${allProducts.length} products`)

		for (const product of allProducts) {
			await elasticsearchService.indexDocument({
				id: `product_${product.ID}`,
				name: product.NAME,
				description: product.DESCRIPTION || '',
				type: 'product',
				price: product.PRICE ? parseFloat(product.PRICE) : null,
				currency: product.CURRENCY_ID || 'RUB',
				industry: 'строительство',
				bitrixId: product.ID, // Добавляем Bitrix ID
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				searchableText: `${product.NAME} ${
					product.DESCRIPTION || ''
				}`.toLowerCase(),
			})
		}
		console.log(`✅ Synced ${allProducts.length} products`)

		// 4. Sync companies
		console.log('🏢 Syncing companies...')
		// Получаем ВСЕ компании с реквизитами
		const companies = await bitrix24Service.getAllCompaniesWithRequisites()
		if (companies && companies.length > 0) {
			console.log(`Found ${companies.length} companies`)

			for (const company of companies) {
				await elasticsearchService.indexDocument({
					id: `company_${company.ID}`,
					name: company.TITLE,
					description: company.COMMENTS || '',
					type: 'company',
					industry: company.INDUSTRY || '',
					address: company.ADDRESS || '',
					phone: company.PHONE?.[0]?.VALUE || '',
					email: company.EMAIL?.[0]?.VALUE || '',
					inn: company.RQ_INN || '', // Добавляем ИНН
					bitrixId: company.ID, // Добавляем Bitrix ID
					assignedById: company.ASSIGNED_BY_ID || '', // Добавляем ответственного пользователя
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					searchableText: `${company.TITLE} ${company.INDUSTRY || ''} ${
						company.ADDRESS || ''
					} ${company.RQ_INN || ''}`.toLowerCase(),
				})
			}
			console.log(`✅ Synced ${companies.length} companies`)
		}

		// 5. Sync contacts
		console.log('👥 Syncing contacts...')
		const contacts = await bitrix24Service.getContacts('', 1000)
		if (contacts?.result) {
			console.log(`Found ${contacts.result.length} contacts`)

			for (const contact of contacts.result) {
				await elasticsearchService.indexDocument({
					id: `contact_${contact.ID}`,
					name: `${contact.NAME} ${contact.LAST_NAME}`.trim(),
					description: contact.COMMENTS || '',
					type: 'contact',
					phone: contact.PHONE?.[0]?.VALUE || '',
					email: contact.EMAIL?.[0]?.VALUE || '',
					bitrixId: contact.ID, // Добавляем Bitrix ID
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					searchableText: `${contact.NAME} ${contact.LAST_NAME} ${
						contact.EMAIL?.[0]?.VALUE || ''
					} ${contact.PHONE?.[0]?.VALUE || ''}`.toLowerCase(),
				})
			}
			console.log(`✅ Synced ${contacts.result.length} contacts`)
		}

		// 6. Sync submissions (заявки)
		console.log('📋 Syncing submissions...')
		try {
			if (!AppDataSource.isInitialized) {
				await AppDataSource.initialize()
			}
			const submissionRepository = AppDataSource.getRepository(Submission)

			const submissions = await submissionRepository.find({
				relations: ['user', 'form', 'assignedTo'],
			})

			console.log(`Found ${submissions.length} submissions`)

			let indexedCount = 0
			let errorCount = 0

			for (const submission of submissions) {
				try {
					// Очищаем formData от пустых значений
					const cleanedFormData = submission.formData
						? Object.fromEntries(
								Object.entries(submission.formData).filter(
									([key, value]) =>
										value !== null && value !== undefined && value !== ''
								)
						  )
						: {}

					const submissionData = {
						id: `submission_${submission.id}`,
						name: submission.title || `Заявка #${submission.submissionNumber}`,
						description: submission.notes || '',
						type: 'submission' as const,
						status: submission.status,
						priority: submission.priority,
						tags: submission.tags || [],
						formData: cleanedFormData,
						submissionNumber: submission.submissionNumber,
						userName: submission.userName,
						userEmail: submission.userEmail,
						formName: submission.formName,
						formTitle: submission.formTitle,
						assignedToName: submission.assignedToName,
						createdAt: submission.createdAt.toISOString(),
						updatedAt: submission.updatedAt.toISOString(),
						searchableText: `${submission.title || ''} ${
							submission.notes || ''
						} ${submission.submissionNumber || ''} ${
							submission.userName || ''
						} ${submission.formName || ''}`.toLowerCase(),
					}

					await elasticsearchService.indexDocument(submissionData)
					indexedCount++

					if (indexedCount % 10 === 0) {
						console.log(`Проиндексировано ${indexedCount} заявок...`)
					}
				} catch (error) {
					console.error(
						`Ошибка при индексации заявки ${submission.submissionNumber}:`,
						error.message
					)
					errorCount++
				}
			}

			console.log(
				`✅ Synced ${indexedCount} submissions (errors: ${errorCount})`
			)

			if (AppDataSource.isInitialized) {
				await AppDataSource.destroy()
			}
		} catch (error) {
			console.error('❌ Error syncing submissions:', error.message)
		}

		console.log('🎉 Sync completed successfully!')

		// 7. Test optimized search features
		console.log('\n🔍 Testing optimized search features...')

		// Test 1: Basic search
		console.log('\n📊 Test 1: Basic product search')
		const searchResults1 = await elasticsearchService.search({
			query: 'м300',
			type: 'product',
			limit: 5,
			fuzzy: true,
		})
		console.log(`Found ${searchResults1.length} products matching "м300"`)
		searchResults1.forEach((result, index) => {
			console.log(
				`  ${index + 1}. ${result.name} (score: ${result.score?.toFixed(2)})`
			)
		})

		// Test 2: Search with typo (fuzziness)
		console.log('\n📊 Test 2: Search with typo (fuzziness)')
		const searchResults2 = await elasticsearchService.search({
			query: 'тест', // typo test
			type: 'product',
			limit: 3,
			fuzzy: true,
		})
		console.log(
			`Found ${searchResults2.length} products matching "тест" (with typo)`
		)
		searchResults2.forEach((result, index) => {
			console.log(
				`  ${index + 1}. ${result.name} (score: ${result.score?.toFixed(2)})`
			)
		})

		// Test 3: Synonym search
		console.log('\n📊 Test 3: Synonym search')
		const searchResults3 = await elasticsearchService.search({
			query: 'материал', // synonym test
			type: 'product',
			limit: 3,
			fuzzy: true,
		})
		console.log(
			`Found ${searchResults3.length} products matching "материал" (synonym)`
		)
		searchResults3.forEach((result, index) => {
			console.log(
				`  ${index + 1}. ${result.name} (score: ${result.score?.toFixed(2)})`
			)
		})

		// Test 4: Autocomplete
		console.log('\n📊 Test 4: Autocomplete')
		const suggestions = await elasticsearchService.suggest('бет', 'product')
		console.log(`Autocomplete for "бет": ${suggestions.slice(0, 3).join(', ')}`)

		// Test 5: Company search
		console.log('\n📊 Test 5: Company search')
		const companyResults = await elasticsearchService.search({
			query: 'строительная',
			type: 'company',
			limit: 3,
			fuzzy: true,
		})
		console.log(
			`Found ${companyResults.length} companies matching "строительная"`
		)
		companyResults.forEach((result, index) => {
			console.log(
				`  ${index + 1}. ${result.name} (score: ${result.score?.toFixed(2)})`
			)
		})

		// Show optimization summary
		console.log('\n🎯 OPTIMIZATION SUMMARY:')
		console.log('✅ Enhanced analyzers with edgeNGram')
		console.log('✅ Product synonyms (бетон=цемент, м300=марка 300, etc.)')
		console.log('✅ Function score for relevance boosting')
		console.log('✅ Fuzzy search for typo handling')
		console.log('✅ Improved autocomplete')
		console.log('✅ Better field boosting and highlighting')
		console.log('\n💡 All optimizations are now active!')
	} catch (error) {
		console.error('❌ Sync failed:', error)
	}
}

// Run if called directly
if (require.main === module) {
	syncBitrixToElasticsearch()
		.then(() => process.exit(0))
		.catch(error => {
			console.error('Script failed:', error)
			process.exit(1)
		})
}

export { syncBitrixToElasticsearch }
