import { AppDataSource } from '../database/config/database.config'

/**
 * Checks if the database connection is active.
 * Attempts to initialize the connection if it's not already initialized.
 */
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
