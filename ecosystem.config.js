module.exports = {
  apps: [{
    name: 'beton-crm',
    script: './server/dist/index.js',
    cwd: '/var/www/beton-crm',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5001,
      DB_HOST: 'localhost',
      DB_PORT: 5432,
      DB_USERNAME: 'beton_user', 
      DB_PASSWORD: process.env.DB_PASSWORD || 'beton_password',
      DB_NAME: 'beton_crm',
      REDIS_HOST: 'localhost',
      REDIS_PORT: 6379,
      JWT_SECRET: process.env.JWT_SECRET,
      JWT_EXPIRES_IN: '7d',
      REFRESH_TOKEN_EXPIRES_IN: '30d',
      BITRIX_WEBHOOK: process.env.BITRIX_WEBHOOK,
      CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000'
    },
    error_file: '/var/log/beton-crm/error.log',
    out_file: '/var/log/beton-crm/out.log',
    log_file: '/var/log/beton-crm/combined.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};