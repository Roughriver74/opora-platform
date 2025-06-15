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
			},
			env_production: {
				NODE_ENV: 'production',
				PORT: 5001,
				MONGODB_URI: 'mongodb://localhost:27017/beton-crm-production',
				DATABASE_NAME: 'beton-crm-production',
				JWT_SECRET: 'beton-crm-production-secret-key-2025',
				JWT_EXPIRES_IN: '7d',
			},
		},
	],
}
