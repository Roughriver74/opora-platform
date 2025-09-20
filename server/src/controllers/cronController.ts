import { Request, Response } from 'express'
import { logger } from '../utils/logger'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export class CronController {
	/**
	 * Получение текущих cron-задач
	 */
	async getCronJobs(req: Request, res: Response): Promise<void> {
		try {
			logger.info('📋 Получение списка cron-задач')

			const { stdout } = await execAsync('crontab -l')
			const cronJobs = stdout
				.split('\n')
				.filter(line => line.trim() && !line.startsWith('#'))
				.map(line => {
					const parts = line.trim().split(' ')
					if (parts.length >= 6) {
						const schedule = parts.slice(0, 5).join(' ')
						const command = parts.slice(5).join(' ')
						return { schedule, command }
					}
					return { schedule: '', command: line.trim() }
				})

			res.json({
				success: true,
				data: {
					cronJobs,
					total: cronJobs.length,
				},
				timestamp: new Date().toISOString(),
			})
		} catch (error: any) {
			logger.error('❌ Ошибка при получении cron-задач:', error)
			res.status(500).json({
				success: false,
				message: 'Ошибка при получении cron-задач',
				error: error.message,
				timestamp: new Date().toISOString(),
			})
		}
	}

	/**
	 * Установка расписания синхронизации
	 */
	async setSyncSchedule(req: Request, res: Response): Promise<void> {
		try {
			const { schedule } = req.body
			logger.info(`⏰ Установка расписания синхронизации: ${schedule}`)

			// Получаем текущие cron-задачи
			let currentCron = ''
			try {
				const { stdout } = await execAsync('crontab -l')
				currentCron = stdout
			} catch (error) {
				// Если crontab пустой, это нормально
				currentCron = ''
			}

			// Удаляем старые задачи синхронизации
			const lines = currentCron.split('\n')
			const filteredLines = lines.filter(
				line =>
					!line.includes('incrementalSyncCron') &&
					!line.includes('incrementalSyncCronNew') &&
					!line.includes('sync:incremental') &&
					line.trim() !== ''
			)

			// Добавляем новую задачу синхронизации
			let newCronJob = ''
			switch (schedule) {
				case 'every_hour':
					newCronJob =
						'0 * * * * node /app/dist/scripts/incrementalSyncCronNew.js >> /app/logs/cron.log 2>&1'
					break
				case 'every_2_hours':
					newCronJob =
						'0 */2 * * * node /app/dist/scripts/incrementalSyncCronNew.js >> /app/logs/cron.log 2>&1'
					break
				case 'every_6_hours':
					newCronJob =
						'0 */6 * * * node /app/dist/scripts/incrementalSyncCronNew.js >> /app/logs/cron.log 2>&1'
					break
				case 'every_12_hours':
					newCronJob =
						'0 */12 * * * node /app/dist/scripts/incrementalSyncCronNew.js >> /app/logs/cron.log 2>&1'
					break
				case 'daily':
					newCronJob =
						'0 2 * * * node /app/dist/scripts/incrementalSyncCronNew.js >> /app/logs/cron.log 2>&1'
					break
				case 'weekly':
					newCronJob =
						'0 2 * * 0 node /app/dist/scripts/incrementalSyncCronNew.js >> /app/logs/cron.log 2>&1'
					break
				default:
					throw new Error(`Неизвестное расписание: ${schedule}`)
			}

			// Добавляем полную синхронизацию ежедневно в 2:00
			const fullSyncJob =
				'0 2 * * * node /app/dist/scripts/incrementalSyncCronNew.js --forceFullSync true >> /app/logs/cron.log 2>&1'

			// Создаем новый crontab
			const newCronContent =
				[
					...filteredLines,
					'# Инкрементальная синхронизация Beton CRM',
					newCronJob,
					'# Полная синхронизация ежедневно',
					fullSyncJob,
				].join('\n') + '\n'

			// Устанавливаем новый crontab
			await execAsync(`echo '${newCronContent}' | crontab -`)

			logger.info('✅ Расписание синхронизации установлено успешно')
			res.json({
				success: true,
				message: `Расписание синхронизации установлено: ${schedule}`,
				data: {
					schedule,
					cronJob: newCronJob,
					fullSyncJob,
				},
				timestamp: new Date().toISOString(),
			})
		} catch (error: any) {
			logger.error('❌ Ошибка при установке расписания:', error)
			res.status(500).json({
				success: false,
				message: 'Ошибка при установке расписания',
				error: error.message,
				timestamp: new Date().toISOString(),
			})
		}
	}

	/**
	 * Остановка cron-задач синхронизации
	 */
	async stopSyncSchedule(req: Request, res: Response): Promise<void> {
		try {
			logger.info('⏹️ Остановка cron-задач синхронизации')

			// Получаем текущие cron-задачи
			let currentCron = ''
			try {
				const { stdout } = await execAsync('crontab -l')
				currentCron = stdout
			} catch (error) {
				// Если crontab пустой, это нормально
				currentCron = ''
			}

			// Удаляем задачи синхронизации
			const lines = currentCron.split('\n')
			const filteredLines = lines.filter(
				line =>
					!line.includes('incrementalSyncCron') &&
					!line.includes('incrementalSyncCronNew') &&
					!line.includes('sync:incremental') &&
					line.trim() !== ''
			)

			// Создаем новый crontab без задач синхронизации
			const newCronContent = filteredLines.join('\n') + '\n'

			// Устанавливаем новый crontab
			await execAsync(`echo '${newCronContent}' | crontab -`)

			logger.info('✅ Cron-задачи синхронизации остановлены')
			res.json({
				success: true,
				message: 'Cron-задачи синхронизации остановлены',
				timestamp: new Date().toISOString(),
			})
		} catch (error: any) {
			logger.error('❌ Ошибка при остановке cron-задач:', error)
			res.status(500).json({
				success: false,
				message: 'Ошибка при остановке cron-задач',
				error: error.message,
				timestamp: new Date().toISOString(),
			})
		}
	}

	/**
	 * Получение статуса cron-сервиса
	 */
	async getCronStatus(req: Request, res: Response): Promise<void> {
		try {
			logger.info('📊 Получение статуса cron-сервиса')

			// Проверяем статус cron-сервиса
			const { stdout: cronStatus } = await execAsync(
				'pgrep cron || echo "not_running"'
			)
			const isRunning = cronStatus.trim() !== 'not_running'

			// Получаем количество активных задач синхронизации
			let syncJobsCount = 0
			try {
				const { stdout } = await execAsync(
					'crontab -l | grep incrementalSyncCronNew | wc -l'
				)
				syncJobsCount = parseInt(stdout.trim()) || 0
			} catch (error) {
				syncJobsCount = 0
			}

			res.json({
				success: true,
				data: {
					cronServiceRunning: isRunning,
					syncJobsCount,
					status: isRunning ? 'active' : 'inactive',
				},
				timestamp: new Date().toISOString(),
			})
		} catch (error: any) {
			logger.error('❌ Ошибка при получении статуса cron:', error)
			res.status(500).json({
				success: false,
				message: 'Ошибка при получении статуса cron',
				error: error.message,
				timestamp: new Date().toISOString(),
			})
		}
	}
}

export const cronController = new CronController()
