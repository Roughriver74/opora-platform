import React from 'react'
import { useBackupManagement } from './hooks/useBackupManagement'
import './BackupManagement.css'

const BackupManagement: React.FC = () => {
	const {
		backups,
		loading,
		error,
		success,
		createBackup,
		restoreBackup,
		deleteBackup,
		refreshBackups,
		clearMessages,
	} = useBackupManagement()

	const formatTimestamp = (timestamp: string) => {
		try {
			// Парсим timestamp в формате YYYY-MM-DDTHH-MM-SS
			const dateStr = timestamp
				.replace(/T/, ' ')
				.replace(/-/g, (match, offset) => {
					// Заменяем первые два дефиса на слеши, остальные на двоеточия
					if (offset < 8) return '/'
					return offset === 10 ? ' ' : ':'
				})

			const date = new Date(dateStr)
			if (isNaN(date.getTime())) {
				return timestamp // Если не удалось распарсить, возвращаем как есть
			}

			return date.toLocaleString('ru-RU', {
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
			})
		} catch {
			return timestamp
		}
	}

	return (
		<div className='backup-management'>
			<div className='backup-header'>
				<h2>🗄️ Управление резервными копиями</h2>
				<div className='backup-actions'>
					<button
						onClick={createBackup}
						disabled={loading}
						className='btn btn-primary'
					>
						{loading ? '⏳ Создание...' : '➕ Создать бэкап'}
					</button>
					<button
						onClick={refreshBackups}
						disabled={loading}
						className='btn btn-secondary'
					>
						🔄 Обновить
					</button>
				</div>
			</div>

			{/* Сообщения об ошибках и успехе */}
			{error && (
				<div className='backup-message error'>
					<span>❌ {error}</span>
					<button onClick={clearMessages} className='close-btn'>
						×
					</button>
				</div>
			)}

			{success && (
				<div className='backup-message success'>
					<pre>{success}</pre>
					<button onClick={clearMessages} className='close-btn'>
						×
					</button>
				</div>
			)}

			{/* Список бэкапов */}
			<div className='backup-list'>
				{loading && !backups.length ? (
					<div className='loading'>⏳ Загрузка списка бэкапов...</div>
				) : backups.length === 0 ? (
					<div className='no-backups'>
						📁 Нет доступных бэкапов
						<p>Создайте первый бэкап, нажав кнопку "Создать бэкап"</p>
					</div>
				) : (
					<div className='backup-items'>
						{backups.map(timestamp => (
							<div key={timestamp} className='backup-item'>
								<div className='backup-info'>
									<div className='backup-timestamp'>
										📅 {formatTimestamp(timestamp)}
									</div>
									<div className='backup-name'>🗂️ {timestamp}</div>
								</div>
								<div className='backup-item-actions'>
									<button
										onClick={() => restoreBackup(timestamp)}
										disabled={loading}
										className='btn btn-warning'
										title='Восстановить из этого бэкапа'
									>
										↩️ Восстановить
									</button>
									<button
										onClick={() => deleteBackup(timestamp)}
										disabled={loading}
										className='btn btn-danger'
										title='Удалить этот бэкап'
									>
										🗑️ Удалить
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Информация о системе бэкапов */}
			<div className='backup-info-panel'>
				<h3>ℹ️ Информация о системе бэкапов</h3>
				<ul>
					<li>
						<strong>Что включает бэкап:</strong> База данных (все коллекции) +
						файлы приложения
					</li>
					<li>
						<strong>Формат:</strong> Архив tar.gz с JSON дампами базы данных
					</li>
					<li>
						<strong>Восстановление:</strong> Полная замена текущих данных и
						файлов
					</li>
					<li>
						<strong>Безопасность:</strong> Восстановление требует подтверждения
						и выполняется в фоне
					</li>
					<li>
						<strong>Рекомендация:</strong> Создавайте бэкапы перед важными
						изменениями
					</li>
				</ul>
			</div>
		</div>
	)
}

export default BackupManagement
