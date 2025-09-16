import 'reflect-metadata'
import dotenv from 'dotenv'
import { elasticsearchService } from '../services/elasticsearchService'
import bitrix24Service from '../services/bitrix24Service'
import { logger } from '../utils/logger'

dotenv.config()

const reindexWithBitrixId = async () => {
	console.log('🚀 Starting reindexing with Bitrix ID support...')

	try {
		// 1. Check Elasticsearch connection
		const isConnected = await elasticsearchService.healthCheck()
		if (!isConnected) {
			console.error('❌ Elasticsearch is not connected')
			return
		}

		// 2. Delete existing index to recreate with new mapping
		console.log('🗑️ Deleting existing index...')
		try {
			await elasticsearchService.deleteIndex()
			console.log('✅ Index deleted successfully')
		} catch (error) {
			console.log('ℹ️ Index does not exist or already deleted')
		}

		// 3. Initialize index with new mapping (includes bitrixId field)
		console.log('📝 Creating index with new mapping...')
		await elasticsearchService.initializeIndex()
		console.log('✅ Index created with new mapping')

		// 4. Re-sync all data with Bitrix ID
		console.log('📦 Re-syncing products with Bitrix ID...')
		const products = await bitrix24Service.getProducts('', 1000)
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
					bitrixId: product.ID, // Bitrix ID
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					searchableText: `${product.NAME} ${
						product.DESCRIPTION || ''
					}`.toLowerCase(),
				})
			}
			console.log(`✅ Re-synced ${products.result.length} products`)
		}

		// 5. Re-sync companies with Bitrix ID
		console.log('🏢 Re-syncing companies with Bitrix ID...')
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
					bitrixId: company.ID, // Bitrix ID
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					searchableText: `${company.TITLE} ${company.INDUSTRY || ''} ${
						company.ADDRESS || ''
					}`.toLowerCase(),
				})
			}
			console.log(`✅ Re-synced ${companies.result.length} companies`)
		}

		// 6. Re-sync contacts with Bitrix ID
		console.log('👥 Re-syncing contacts with Bitrix ID...')
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
					bitrixId: contact.ID, // Bitrix ID
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					searchableText: `${contact.NAME} ${contact.LAST_NAME} ${
						contact.EMAIL?.[0]?.VALUE || ''
					} ${contact.PHONE?.[0]?.VALUE || ''}`.toLowerCase(),
				})
			}
			console.log(`✅ Re-synced ${contacts.result.length} contacts`)
		}

		console.log('🎉 Reindexing completed successfully!')

		// 7. Test search by Bitrix ID
		console.log('\n🔍 Testing Bitrix ID search...')

		// Test company search by ID
		const companySearchResults = await elasticsearchService.search({
			query: '4880', // Пример Bitrix ID
			type: 'company',
			limit: 5,
		})
		console.log(
			`Found ${companySearchResults.length} companies matching Bitrix ID "4880"`
		)
		companySearchResults.forEach((result, index) => {
			console.log(
				`${index + 1}. ${result.name} (Bitrix ID: ${result.bitrixId}, score: ${
					result.score
				})`
			)
		})

		// Test contact search by ID
		const contactSearchResults = await elasticsearchService.search({
			query: '4880', // Пример Bitrix ID
			type: 'contact',
			limit: 5,
		})
		console.log(
			`Found ${contactSearchResults.length} contacts matching Bitrix ID "4880"`
		)
		contactSearchResults.forEach((result, index) => {
			console.log(
				`${index + 1}. ${result.name} (Bitrix ID: ${result.bitrixId}, score: ${
					result.score
				})`
			)
		})
	} catch (error) {
		console.error('❌ Reindexing failed:', error)
	}
}

// Run if called directly
if (require.main === module) {
	reindexWithBitrixId()
		.then(() => process.exit(0))
		.catch(error => {
			console.error('Script failed:', error)
			process.exit(1)
		})
}

export { reindexWithBitrixId }
