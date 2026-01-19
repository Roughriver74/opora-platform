import dotenv from 'dotenv'
import { AppDataSource } from '../database/config/database.config'
import { getSettingsService } from '../services/SettingsService'
import { SettingCategory } from '../database/entities/Settings.entity'

// Загружаем переменные окружения
dotenv.config()

/**
 * Скрипт для явной миграции настроек Bitrix24 из .env в базу данных
 * Запуск: npm run migrate:env-to-db
 *
 * Этот скрипт:
 * 1. Читает BITRIX24_ENABLED и BITRIX24_WEBHOOK_URL из .env
 * 2. Создает или обновляет настройки в БД (с автошифрованием webhook URL)
 * 3. Сохраняет историю миграции
 */
async function migrateEnvToDb() {
	console.log('='.repeat(60))
	console.log('МИГРАЦИЯ НАСТРОЕК BITRIX24 ИЗ .ENV В БАЗУ ДАННЫХ')
	console.log('='.repeat(60))

	try {
		// 1. Инициализация подключения к БД
		console.log('\n[1/5] Инициализация подключения к базе данных...')
		if (!AppDataSource.isInitialized) {
			await AppDataSource.initialize()
		}
		console.log('✅ Подключение к БД установлено')

		// 2. Чтение настроек из .env
		console.log('\n[2/5] Чтение настроек из .env файла...')
		const enabledFromEnv = process.env.BITRIX24_ENABLED === 'true'
		const webhookFromEnv = process.env.BITRIX24_WEBHOOK_URL || ''

		console.log(`  BITRIX24_ENABLED: ${enabledFromEnv}`)
		console.log(
			`  BITRIX24_WEBHOOK_URL: ${webhookFromEnv ? '***установлен***' : '(пусто)'}`
		)

		if (!webhookFromEnv && enabledFromEnv) {
			console.warn(
				'⚠️  ПРЕДУПРЕЖДЕНИЕ: BITRIX24_ENABLED=true, но WEBHOOK_URL не установлен!'
			)
		}

		// 3. Проверка существующих настроек в БД
		console.log('\n[3/5] Проверка существующих настроек в БД...')
		const settingsService = getSettingsService()

		const existingEnabled = await settingsService.findByKey('bitrix24.enabled')
		const existingWebhook = await settingsService.findByKey('bitrix24.webhook_url')

		if (existingEnabled) {
			console.log(`  ⚠️  bitrix24.enabled уже существует в БД: ${existingEnabled.getValue()}`)
		}
		if (existingWebhook) {
			console.log('  ⚠️  bitrix24.webhook_url уже существует в БД (зашифрован)')
		}

		// 4. Создание/обновление настроек
		console.log('\n[4/5] Создание/обновление настроек...')

		// Настройка enabled
		await settingsService.upsertSetting('bitrix24.enabled', enabledFromEnv, {
			description: 'Включить интеграцию с Bitrix24 CRM',
			category: SettingCategory.BITRIX,
			isPublic: false,
			validation: { type: 'boolean', required: true },
		})
		console.log(`  ✅ bitrix24.enabled = ${enabledFromEnv}`)

		// Настройка webhook_url (с автошифрованием)
		await settingsService.upsertSetting('bitrix24.webhook_url', webhookFromEnv, {
			description: 'Webhook URL для Bitrix24 REST API',
			category: SettingCategory.BITRIX,
			isPublic: false,
			isEncrypted: true,
			validation: {
				type: 'string',
				pattern: '^https?://.*bitrix24\\.(ru|com|net|by|kz|ua)/rest/',
			},
		})
		console.log('  ✅ bitrix24.webhook_url сохранен (автоматически зашифрован)')

		// 5. Проверка результата
		console.log('\n[5/5] Проверка результата миграции...')
		const migratedEnabled = await settingsService.getSettingValue<boolean>(
			'bitrix24.enabled'
		)
		const migratedWebhook = await settingsService.getSettingValueDecrypted<string>(
			'bitrix24.webhook_url'
		)

		console.log(`  Проверка bitrix24.enabled: ${migratedEnabled}`)
		console.log(
			`  Проверка bitrix24.webhook_url: ${
				migratedWebhook ? '***зашифрован и доступен***' : '(пусто)'
			}`
		)

		// Сверка
		if (migratedEnabled === enabledFromEnv && migratedWebhook === webhookFromEnv) {
			console.log('\n' + '='.repeat(60))
			console.log('🎉 МИГРАЦИЯ ЗАВЕРШЕНА УСПЕШНО!')
			console.log('='.repeat(60))
			console.log('\nТеперь настройки Bitrix24 читаются из БД (приоритет над .env).')
			console.log('Вы можете изменить их через админ-панель:')
			console.log('  Настройки → Bitrix24 Интеграция\n')
		} else {
			console.error('\n❌ ОШИБКА: Несоответствие данных после миграции!')
			process.exit(1)
		}
	} catch (error: any) {
		console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА при миграции:', error.message)
		console.error(error.stack)
		process.exit(1)
	} finally {
		// Закрываем подключение к БД
		if (AppDataSource.isInitialized) {
			await AppDataSource.destroy()
		}
	}
}

// Запуск миграции
migrateEnvToDb().catch((error) => {
	console.error('Необработанная ошибка:', error)
	process.exit(1)
})
