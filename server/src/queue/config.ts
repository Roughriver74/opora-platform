import { ConnectionOptions } from 'bullmq'
import { logger } from '../utils/logger'

/**
 * Конфигурация подключения к Redis для BullMQ
 */
const redisHost = process.env.REDIS_HOST || 'localhost'
const redisPort = parseInt(process.env.REDIS_PORT || '6379')
const redisPassword = process.env.REDIS_PASSWORD

// Логируем конфигурацию для диагностики
logger.info(`🔧 Redis конфигурация: host=${redisHost}, port=${redisPort}, password=${redisPassword ? '***' : 'не установлен'}`)

export const redisConnection: ConnectionOptions = {
	host: redisHost,
	port: redisPort,
	password: redisPassword,
	maxRetriesPerRequest: 3,
	enableReadyCheck: true,
	connectTimeout: 10000, // 10 секунд таймаут подключения
	retryStrategy: (times: number) => {
		// Увеличиваем интервал между попытками подключения
		const delay = Math.min(times * 1000, 30000)
		logger.warn(`🔄 Переподключение к Redis (${redisHost}:${redisPort}) через ${delay}ms (попытка ${times})`)
		return delay
	},
}

/**
 * Имена очередей
 */
export enum QueueName {
	SUBMISSION = 'submission-queue',
	SCHEDULED_SUBMISSION = 'scheduled-submission-queue',
}

/**
 * Конфигурация задач по умолчанию
 */
export const defaultJobOptions = {
	attempts: 3,
	backoff: {
		type: 'exponential' as const,
		delay: 5000, // 5 секунд
	},
	removeOnComplete: {
		age: 24 * 3600, // Хранить выполненные задачи 24 часа
		count: 1000, // Максимум 1000 выполненных задач
	},
	removeOnFail: {
		age: 7 * 24 * 3600, // Хранить неудачные задачи 7 дней
	},
}

/**
 * Типы задач для очереди заявок
 */
export enum SubmissionJobType {
	CREATE_SINGLE = 'create-single-submission',
	CREATE_SCHEDULED = 'create-scheduled-submission',
	SYNC_WITH_BITRIX = 'sync-submission-with-bitrix',
}

/**
 * Интерфейс данных для задачи создания заявки
 */
export interface CreateSubmissionJobData {
	type: SubmissionJobType.CREATE_SINGLE | SubmissionJobType.CREATE_SCHEDULED
	scheduledSubmissionId?: string // ID записи в scheduled_submissions
	formId: string
	formData: Record<string, any>
	userId?: string
	userName?: string
	userEmail?: string
	assignedToId?: string
	priority?: string
	metadata?: {
		periodGroupId?: string
		periodPosition?: number
		totalInPeriod?: number
		scheduledDate?: string
		scheduledTime?: string
	}
}

/**
 * Интерфейс результата выполнения задачи
 */
export interface JobResult {
	success: boolean
	submissionId?: string
	submissionNumber?: string
	bitrixDealId?: string
	error?: string
}