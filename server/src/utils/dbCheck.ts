import { AppDataSource } from '../database/config/database.config'

export async function checkDatabaseConnection(): Promise<boolean> {
	try {
		if (!AppDataSource.isInitialized) {
			await AppDataSource.initialize()
		}
		return AppDataSource.isInitialized
	} catch {
		return false
	}
}
