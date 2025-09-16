import 'reflect-metadata'
import dotenv from 'dotenv'
import { elasticsearchService } from '../services/elasticsearchService'
import bitrix24Service from '../services/bitrix24Service'
import { logger } from '../utils/logger'

dotenv.config()

const syncBitrixToElasticsearch = async () => {
	console.log('🚀 Starting Bitrix24 to Elasticsearch sync...')

	try {
		// 1. Check Elasticsearch connection
		const isConnected = await elasticsearchService.healthCheck()
		if (!isConnected) {
			console.error('❌ Elasticsearch is not connected')
			return
		}

		// 2. Initialize index
		await elasticsearchService.initializeIndex()

		// 3. Sync products
		console.log('📦 Syncing products...')
		const products = await bitrix24Service.getProducts('', 1000) // Get all products
		if (products?.result) {
			console.log(`Found ${products.result.length} products`)

			for (const product of products.result) {
				await elasticsearchService.indexDocument({
					id: `product_${product.ID}`,
					name: product.NAME,
					description: product.DESCRIPTION || '',
					type: 'product',
					price: product.PRICE ? parseFloat(product.PRICE) : null,
					currency: product.CURRENCY_ID || 'RUB',
					industry: 'строительство',
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					searchableText: `${product.NAME} ${
						product.DESCRIPTION || ''
					}`.toLowerCase(),
				})
			}
			console.log(`✅ Synced ${products.result.length} products`)
		}

		// 4. Sync companies
		console.log('🏢 Syncing companies...')
		const companies = await bitrix24Service.getCompanies('', 1000, null, true)
		if (companies?.result) {
			console.log(`Found ${companies.result.length} companies`)

			for (const company of companies.result) {
				await elasticsearchService.indexDocument({
					id: `company_${company.ID}`,
					name: company.TITLE,
					description: company.COMMENTS || '',
					type: 'company',
					industry: company.INDUSTRY || '',
					address: company.ADDRESS || '',
					phone: company.PHONE?.[0]?.VALUE || '',
					email: company.EMAIL?.[0]?.VALUE || '',
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					searchableText: `${company.TITLE} ${company.INDUSTRY || ''} ${
						company.ADDRESS || ''
					}`.toLowerCase(),
				})
			}
			console.log(`✅ Synced ${companies.result.length} companies`)
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
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					searchableText: `${contact.NAME} ${contact.LAST_NAME} ${
						contact.EMAIL?.[0]?.VALUE || ''
					} ${contact.PHONE?.[0]?.VALUE || ''}`.toLowerCase(),
				})
			}
			console.log(`✅ Synced ${contacts.result.length} contacts`)
		}

		console.log('🎉 Sync completed successfully!')

		// 6. Test search
		console.log('\n🔍 Testing search...')
		const searchResults = await elasticsearchService.search({
			query: 'м300',
			type: 'product',
			limit: 5,
		})
		console.log(`Found ${searchResults.length} products matching "м300"`)
		searchResults.forEach((result, index) => {
			console.log(`${index + 1}. ${result.name} (score: ${result.score})`)
		})
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
