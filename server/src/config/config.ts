import dotenv from 'dotenv'

dotenv.config()

const config = {
	port: process.env.PORT || 5001,
	mongoUri:
		process.env.MONGODB_URI || 'mongodb://localhost:27017/beton-crm-production',
	bitrix24WebhookUrl:
		process.env.BITRIX24_WEBHOOK_URL ||
		'https://crm.betonexpress.pro/rest/3/74sbx907svrq1v10/',
}

export default config
