import { useState, useEffect } from 'react'
import {
	listBackups,
	createBackup as createBackupAPI,
	restoreBackup as restoreBackupAPI,
	deleteBackup as deleteBackupAPI,
} from '../../../../services/backupService'

export const useBackupManagement = () => {
	const [backups, setBackups] = useState<string[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState<string | null>(null)

	const loadBackups = async () => {
		try {
			setLoading(true)
			setError(null)
			const backupList = await listBackups()
			setBackups(backupList)
		} catch (err: any) {
			setError(err.response?.data?.message || 'Ошибка загрузки списка бэкапов')
		} finally {
			setLoading(false)
		}
	}

	const createBackup = async () => {
		try {
			setLoading(true)
			setError(null)
			setSuccess(null)

			await createBackupAPI()
			setSuccess('Бэкап успешно создан')

			// Перезагружаем список бэкапов
			await loadBackups()
		} catch (err: any) {
			setError(err.response?.data?.message || 'Ошибка создания бэкапа')
		} finally {
			setLoading(false)
		}
	}

	const restoreBackup = async (timestamp: string) => {
		// Дополнительное подтверждение от пользователя
		const confirmMessage = `⚠️ ВНИМАНИЕ! ⚠️

Вы собираетесь восстановить систему из бэкапа '${timestamp}'.

ЭТО ДЕЙСТВИЕ:
• Полностью перезапишет базу данных
• Заменит все файлы приложения
• Может привести к потере текущих данных
• Требует перезапуска сервера

Вы ДЕЙСТВИТЕЛЬНО уверены, что хотите продолжить?`

		if (!window.confirm(confirmMessage)) {
			return
		}

		try {
			setLoading(true)
			setError(null)
			setSuccess(null)

			const response = await restoreBackupAPI(timestamp)

			// Специальное сообщение для восстановления
			const warningText = response.warning ? `\n\n⚠️ ${response.warning}` : ''
			setSuccess(
				`✅ ${response.message}${warningText}\n\n🔄 Рекомендуется перезагрузить страницу через 1-2 минуты.`
			)
		} catch (err: any) {
			setError(err.response?.data?.message || 'Ошибка восстановления из бэкапа')
		} finally {
			setLoading(false)
		}
	}

	const deleteBackup = async (timestamp: string) => {
		if (
			!window.confirm(`Вы уверены, что хотите удалить бэкап '${timestamp}'?`)
		) {
			return
		}

		try {
			setLoading(true)
			setError(null)
			setSuccess(null)

			await deleteBackupAPI(timestamp)
			setSuccess(`Бэкап '${timestamp}' успешно удален`)

			// Перезагружаем список бэкапов
			await loadBackups()
		} catch (err: any) {
			setError(err.response?.data?.message || 'Ошибка удаления бэкапа')
		} finally {
			setLoading(false)
		}
	}

	const clearMessages = () => {
		setError(null)
		setSuccess(null)
	}

	useEffect(() => {
		loadBackups()
	}, [])

	return {
		backups,
		loading,
		error,
		success,
		createBackup,
		restoreBackup,
		deleteBackup,
		refreshBackups: loadBackups,
		clearMessages,
	}
}
