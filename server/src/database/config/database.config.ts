import { DataSource, DataSourceOptions } from 'typeorm'
import * as dotenv from 'dotenv'
import { join } from 'path'
import { SnakeNamingStrategy } from './naming.strategy'

dotenv.config()

export const databaseConfig: DataSourceOptions = {
	type: 'postgres',
	host: process.env.DB_HOST || 'localhost',
	port: parseInt(process.env.DB_PORT || '5432'),
	username: process.env.DB_USERNAME || 'beton_user',
	password: process.env.DB_PASSWORD || 'beton_password',
	database: process.env.DB_NAME || 'beton_crm',
	entities: [join(__dirname, '../entities/**/*.entity{.ts,.js}')],
	migrations: [],
	synchronize: false,
	logging: process.env.NODE_ENV === 'development',
	ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
	poolSize: parseInt(process.env.DB_POOL_SIZE || '10'),
	extra: {
		max: parseInt(process.env.DB_POOL_SIZE || '10'),
		connectionTimeoutMillis: 5000,
	},
	namingStrategy: new SnakeNamingStrategy(),
}

export const AppDataSource = new DataSource(databaseConfig)

export const initializeDatabase = async (): Promise<DataSource> => {
	try {
		if (!AppDataSource.isInitialized) {
			await AppDataSource.initialize()
			console.log('✅ База данных успешно подключена')
		}
		return AppDataSource
	} catch (error) {
		console.error('❌ Ошибка подключения к базе данных:', error)
		throw error
	}
}

export const closeDatabaseConnection = async (): Promise<void> => {
	try {
		if (AppDataSource.isInitialized) {
			await AppDataSource.destroy()
			console.log('База данных отключена')
		}
	} catch (error) {
		console.error('Ошибка при отключении базы данных:', error)
		throw error
	}
}