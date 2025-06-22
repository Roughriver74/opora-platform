import api from './api'

export const listBackups = async (): Promise<string[]> => {
	const { data } = await api.get<string[]>('/backups')
	return data
}

export const createBackup = async (): Promise<{ message: string }> => {
	const { data } = await api.post<{ message: string }>('/backups/create')
	return data
}

export const restoreBackup = async (
	timestamp: string
): Promise<{ message: string; warning?: string }> => {
	const { data } = await api.post<{ message: string; warning?: string }>(
		`/backups/restore/${timestamp}`
	)
	return data
}

export const deleteBackup = async (
	timestamp: string
): Promise<{ message: string }> => {
	const { data } = await api.delete<{ message: string }>(
		`/backups/${timestamp}`
	)
	return data
}
