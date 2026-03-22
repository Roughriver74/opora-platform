import dotenv from 'dotenv'

dotenv.config()

const config = {
	port: process.env.PORT || 4201,
	mongoUri:
		process.env.MONGODB_URI || 'mongodb://localhost:27017/opora-production',
	bitrix24Enabled: process.env.BITRIX24_ENABLED === 'true',
	bitrix24WebhookUrl:
		process.env.BITRIX24_WEBHOOK_URL || '',
	redisUrl: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
}

export default config
