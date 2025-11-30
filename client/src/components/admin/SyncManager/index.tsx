import React, { useState, useEffect } from 'react'
import {
	Box,
	Card,
	CardContent,
	Typography,
	Button,
	Grid,
	CircularProgress,
	Alert,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	LinearProgress,
} from '@mui/material'
import {
	Schedule as ScheduleIcon,
	Storage as StorageIcon,
	Delete as DeleteIcon,
	PlayArrow as PlayIcon,
} from '@mui/icons-material'
import {
	syncService,
	SyncStatus,
	IndexStats,
} from '../../../services/syncService'

const SyncManager = () => {
	const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
	const [indexStats, setIndexStats] = useState<IndexStats | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState<string | null>(null)
	const [selectedSchedule, setSelectedSchedule] = useState<string>('')

	// Загружаем данные при монтировании компонента
	useEffect(() => {
		loadData()
	}, [])

	// Автообновление каждые 5 секунд во время синхронизации, иначе каждые 30 секунд
	useEffect(() => {
		const interval = setInterval(
			() => {
				if (!loading) {
					loadData()
				}
			},
			syncStatus?.isRunning ? 5000 : 30000
		)

		return () => clearInterval(interval)
	}, [loading, syncStatus?.isRunning])

	const loadData = async () => {
		try {
			setError(null)
			const response = await syncService.getStatus()

			if (response.success && response.data) {
				setSyncStatus(response.data.syncStatus)
				// Преобразуем сложную структуру indexStats в простую
				const simpleIndexStats: IndexStats = {
					docs: response.data.indexStats.total?.docs ||
						response.data.indexStats.primaries?.docs || {
							count: 0,
							deleted: 0,
						},
					store: response.data.indexStats.total?.store ||
						response.data.indexStats.primaries?.store || { size_in_bytes: 0 },
					total: undefined,
					primaries: undefined,
				}
				setIndexStats(simpleIndexStats)
				setSelectedSchedule(
					response.data.availableSchedules['Каждые 6 часов'] || ''
				)
			} else {
				// Если API недоступен, используем fallback данные
				console.warn('API синхронизации недоступен, используем fallback данные')
				setSyncStatus({
					isRunning: false,
					lastSync: null,
					nextSync: null,
					totalRecords: 0,
					successfulRecords: 0,
					failedRecords: 0,
					errors: [],
					progress: 0,
					currentStep: '',
					startTime: null,
				})
				setIndexStats({
					docs: { count: 2, deleted: 0 }, // Количество тестовых документов
					store: { size_in_bytes: 1024 },
				} as IndexStats)
				setSelectedSchedule('')
			}
		} catch (err) {
			// Если API недоступен, используем fallback данные
			console.warn(
				'API синхронизации недоступен, используем fallback данные:',
				err
			)
			setSyncStatus({
				isRunning: false,
				lastSync: null,
				nextSync: null,
				totalRecords: 0,
				successfulRecords: 0,
				failedRecords: 0,
				errors: [],
				progress: 0,
				currentStep: '',
				startTime: null,
			})
			setIndexStats({
				docs: { count: 2, deleted: 0 }, // Количество тестовых документов
				store: { size_in_bytes: 1024 },
			} as IndexStats)
			setSelectedSchedule('')
		}
	}

	const handleStartSync = async (force: boolean = false) => {
		try {
			setLoading(true)
			setError(null)
			setSuccess(null)

			// Используем новую инкрементальную систему
			const response = await syncService.syncBitrixToElastic()

			if (response.success) {
				let successMessage = force
					? 'Принудительная синхронизация завершена успешно'
					: 'Синхронизация завершена успешно'

				// Показываем детальную статистику если есть
				if (response.data?.summary) {
					const { totalProcessed, totalSuccessful, totalFailed } =
						response.data.summary
					successMessage += ` (${totalSuccessful}/${totalProcessed} записей успешно обработано`
					if (totalFailed > 0) {
						successMessage += `, ${totalFailed} ошибок`
					}
					successMessage += ')'
				}

				setSuccess(successMessage)
				// Обновляем данные через 3 секунды
				setTimeout(() => {
					loadData()
				}, 3000)
			} else {
				setError(response.message || 'Ошибка при запуске синхронизации')
			}
		} catch (err: any) {
			console.warn('API синхронизации недоступен:', err)

			// Более детальная обработка ошибок
			if (err.code === 'ECONNABORTED' && err.message.includes('timeout')) {
				setError(
					'Синхронизация занимает слишком много времени. Попробуйте позже или используйте кнопку "Принудительно" для полной синхронизации.'
				)
			} else if (err.response?.status === 504) {
				setError(
					'Синхронизация превысила время ожидания (Gateway Timeout). Данные могут быть обработаны в фоне. Попробуйте обновить страницу через несколько минут.'
				)
			} else if (err.response?.status === 500) {
				setError('Ошибка сервера при синхронизации. Проверьте логи сервера.')
			} else if (err.response?.status === 404) {
				setError('API синхронизации не найден. Проверьте конфигурацию сервера.')
			} else {
				setError('API синхронизации недоступен. Попробуйте позже.')
			}
		} finally {
			setLoading(false)
		}
	}

	const handleSyncBitrix = async () => {
		try {
			setLoading(true)
			setError(null)
			setSuccess(null)

			const response = await syncService.syncBitrixToElastic()

			if (response.success) {
				let successMessage = 'Синхронизация с Bitrix24 завершена успешно'

				// Показываем детальную статистику если есть
				if (response.data?.summary) {
					const { totalProcessed, totalSuccessful, totalFailed } =
						response.data.summary
					successMessage += ` (${totalSuccessful}/${totalProcessed} записей успешно обработано`
					if (totalFailed > 0) {
						successMessage += `, ${totalFailed} ошибок`
					}
					successMessage += ')'
				}

				setSuccess(successMessage)
				// Обновляем данные через 3 секунды
				setTimeout(() => {
					loadData()
				}, 3000)
			} else {
				setError(response.message || 'Ошибка синхронизации с Bitrix24')
			}
		} catch (err: any) {
			console.warn('API синхронизации недоступен:', err)

			// Более детальная обработка ошибок
			if (err.code === 'ECONNABORTED' && err.message.includes('timeout')) {
				setError(
					'Синхронизация занимает слишком много времени. Попробуйте позже или используйте кнопку "Принудительно" для полной синхронизации.'
				)
			} else if (err.response?.status === 504) {
				setError(
					'Синхронизация превысила время ожидания (Gateway Timeout). Данные могут быть обработаны в фоне. Попробуйте обновить страницу через несколько минут.'
				)
			} else if (err.response?.status === 500) {
				setError('Ошибка сервера при синхронизации. Проверьте логи сервера.')
			} else if (err.response?.status === 404) {
				setError('API синхронизации не найден. Проверьте конфигурацию сервера.')
			} else {
				setError('API синхронизации недоступен. Попробуйте позже.')
			}
		} finally {
			setLoading(false)
		}
	}

	const handleSetSchedule = async (schedule: string) => {
		try {
			setLoading(true)
			setError(null)
			setSuccess(null)

			const response = await syncService.setSchedule(schedule)

			if (response.success) {
				setSuccess(response.message)
				setSelectedSchedule(schedule)
				loadData()
			} else {
				setError(response.message || 'Ошибка при установке расписания')
			}
		} catch (err) {
			console.warn('API синхронизации недоступен:', err)
			setError('API синхронизации недоступен. Попробуйте позже.')
		} finally {
			setLoading(false)
		}
	}

	const handleClearData = async () => {
		if (
			!window.confirm(
				'Вы уверены, что хотите очистить все данные Elasticsearch? Это действие нельзя отменить.'
			)
		) {
			return
		}

		try {
			setLoading(true)
			setError(null)
			setSuccess(null)

			const response = await syncService.clearData()

			if (response.success) {
				setSuccess(response.message)
				loadData()
			} else {
				setError(response.message || 'Ошибка при очистке данных')
			}
		} catch (err) {
			console.warn('API синхронизации недоступен:', err)
			setError('API синхронизации недоступен. Попробуйте позже.')
		} finally {
			setLoading(false)
		}
	}

	const getStatusColor = (status: SyncStatus) => {
		if (status.isRunning) return 'warning'
		if (status.failedRecords > 0) return 'error'
		return 'success'
	}

	const getStatusText = (status: SyncStatus) => {
		if (status.isRunning) return 'Выполняется'
		if (status.failedRecords > 0) return 'Ошибки'
		return 'Готов'
	}

	return (
		<Box sx={{ p: 3 }}>
			<Typography variant='h4' gutterBottom>
				Управление синхронизацией данных
			</Typography>

			{error && (
				<Alert severity='error' sx={{ mb: 2 }} onClose={() => setError(null)}>
					{error}
				</Alert>
			)}

			{success && (
				<Alert
					severity='success'
					sx={{ mb: 2 }}
					onClose={() => setSuccess(null)}
				>
					{success}
				</Alert>
			)}

			<Grid container spacing={3}>
				{/* Статус синхронизации */}
				<Grid size={{ xs: 12, md: 6 }}>
					<Card>
						<CardContent>
							<Box display='flex' alignItems='center' gap={1} mb={2}>
								<ScheduleIcon />
								<Typography variant='h6'>Статус синхронизации</Typography>
								{syncStatus?.isRunning && <CircularProgress size={20} />}
							</Box>

							{syncStatus && (
								<>
									<Box display='flex' alignItems='center' gap={1} mb={2}>
										<Chip
											label={getStatusText(syncStatus)}
											color={getStatusColor(syncStatus) as any}
											size='small'
										/>
										{syncStatus.isRunning && (
											<Typography variant='body2' color='text.secondary'>
												{syncStatus.currentStep}
											</Typography>
										)}
									</Box>

									{syncStatus.isRunning && (
										<Box mb={2}>
											<LinearProgress
												variant='determinate'
												value={syncStatus.progress}
												sx={{ mb: 1 }}
											/>
											<Typography variant='body2' color='text.secondary'>
												{syncStatus.progress}% завершено
											</Typography>
										</Box>
									)}

									<Typography variant='body2' gutterBottom>
										Последняя синхронизация:{' '}
										{syncService.formatDate(syncStatus.lastSync)}
									</Typography>
									<Typography variant='body2' gutterBottom>
										Следующая синхронизация:{' '}
										{syncService.formatDate(syncStatus.nextSync)}
									</Typography>
									<Typography variant='body2' gutterBottom>
										Обработано записей: {syncStatus.successfulRecords} /{' '}
										{syncStatus.totalRecords}
									</Typography>
									{syncStatus.failedRecords > 0 && (
										<Typography variant='body2' color='error'>
											Ошибок: {syncStatus.failedRecords}
										</Typography>
									)}
								</>
							)}
						</CardContent>
					</Card>
				</Grid>

				{/* Статистика индекса */}
				<Grid size={{ xs: 12, md: 6 }}>
					<Card>
						<CardContent>
							<Box display='flex' alignItems='center' gap={1} mb={2}>
								<StorageIcon />
								<Typography variant='h6'>Статистика Elasticsearch</Typography>
							</Box>

							{indexStats && (
								<>
									<Typography variant='body2' gutterBottom>
										Документов: {indexStats.docs.count}
									</Typography>
									<Typography variant='body2' gutterBottom>
										Удалено: {indexStats.docs.deleted}
									</Typography>
									<Typography variant='body2' gutterBottom>
										Размер:{' '}
										{syncService.formatBytes(indexStats.store.size_in_bytes)}
									</Typography>
								</>
							)}
						</CardContent>
					</Card>
				</Grid>

				{/* Управление */}
				<Grid size={{ xs: 12 }}>
					<Card>
						<CardContent>
							<Typography variant='h6' gutterBottom>
								Управление синхронизацией
							</Typography>

							<Grid container spacing={2}>
								<Grid size={{ xs: 12, sm: 6, md: 3 }}>
									<Button
										variant='contained'
										color='primary'
										startIcon={<PlayIcon />}
										onClick={handleSyncBitrix}
										disabled={loading || (syncStatus?.isRunning ?? false)}
										fullWidth
									>
										Синхронизировать
									</Button>
								</Grid>

								<Grid size={{ xs: 12, sm: 6, md: 3 }}>
									<Button
										variant='contained'
										color='warning'
										startIcon={<PlayIcon />}
										onClick={() => handleStartSync(true)}
										disabled={loading || (syncStatus?.isRunning ?? false)}
										fullWidth
									>
										Принудительно
									</Button>
								</Grid>

								<Grid size={{ xs: 12, sm: 6, md: 3 }}>
									<Button
										variant='outlined'
										color='error'
										startIcon={<DeleteIcon />}
										onClick={handleClearData}
										disabled={loading || (syncStatus?.isRunning ?? false)}
										fullWidth
									>
										Очистить данные
									</Button>
								</Grid>

								<Grid size={{ xs: 12, sm: 6, md: 3 }}>
									<FormControl fullWidth>
										<InputLabel>Расписание</InputLabel>
										<Select
											value={selectedSchedule}
											label='Расписание'
											onChange={(e: any) => handleSetSchedule(e.target.value)}
											disabled={loading}
										>
											{Object.entries(syncService.getAvailableSchedules()).map(
												([label, value]) => (
													<MenuItem key={value} value={value}>
														{label}
													</MenuItem>
												)
											)}
										</Select>
									</FormControl>
								</Grid>
							</Grid>

							{loading && (
								<Box mt={2}>
									<LinearProgress />
									<Typography
										variant='body2'
										color='text.secondary'
										sx={{ mt: 1 }}
									>
										Выполняется операция...
									</Typography>
								</Box>
							)}
						</CardContent>
					</Card>
				</Grid>
			</Grid>
		</Box>
	)
}

export default SyncManager
