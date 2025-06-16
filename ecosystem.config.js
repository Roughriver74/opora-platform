module.exports = {
	apps: [
		{
			name: 'beton-crm',
			script: './server/dist/index.js',
			instances: 1,
			autorestart: true,
			watch: false,
			max_memory_restart: '1G',
			env: {
				NODE_ENV: 'development',
				PORT: 5001,
				// MongoDB
				MONGODB_URI: 'mongodb://localhost:27017/beton-crm',
				// JWT
				JWT_SECRET: 'your-super-secret-jwt-key-change-in-production',
				JWT_EXPIRES_IN: '4h',
				// Bitrix24
				BITRIX24_WEBHOOK_URL:
					'https://crm.betonexpress.pro/rest/3/74sbx907svrq1v10/',
				// Админ пароль
				ADMIN_PASSWORD: 'admin123',
			},
			env_production: {
				NODE_ENV: 'production',
				PORT: 5001,
				MONGODB_URI: 'mongodb://localhost:27017/beton-crm-production',
				DATABASE_NAME: 'beton-crm-production',
				JWT_SECRET: 'beton-crm-production-secret-key-2025',
				JWT_EXPIRES_IN: '4h',
			},
		},
	],
}
