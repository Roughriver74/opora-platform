import { MigrationInterface, QueryRunner } from 'typeorm'
import { encrypt } from '../../utils/encryption'
import dotenv from 'dotenv'

dotenv.config()

export class AddBitrix24SettingsToDB1758200000000 implements MigrationInterface {
	name = 'AddBitrix24SettingsToDB1758200000000'

	public async up(queryRunner: QueryRunner): Promise<void> {
		// Проверяем существование настроек Bitrix24
		const existingEnabled = await queryRunner.query(
			`SELECT * FROM settings WHERE key = 'bitrix24.enabled' LIMIT 1`
		)

		const existingWebhook = await queryRunner.query(
			`SELECT * FROM settings WHERE key = 'bitrix24.webhook_url' LIMIT 1`
		)

		// Если настройки уже существуют - не перезаписываем
		if (existingEnabled.length > 0 && existingWebhook.length > 0) {
			console.log('[Migration] Настройки Bitrix24 уже существуют - пропускаем миграцию')
			return
		}

		// Читаем значения из .env
		const enabledFromEnv = process.env.BITRIX24_ENABLED === 'true'
		const webhookFromEnv = process.env.BITRIX24_WEBHOOK_URL || ''

		// Создаем настройку bitrix24.enabled (если не существует)
		if (existingEnabled.length === 0) {
			await queryRunner.query(
				`INSERT INTO settings (key, value, category, description, is_public, is_encrypted, created_at, updated_at)
				VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
				[
					'bitrix24.enabled',
					JSON.stringify(enabledFromEnv),
					'bitrix',
					'Включить интеграцию с Bitrix24 CRM',
					false,
					false,
				]
			)
			console.log(
				`[Migration] Создана настройка bitrix24.enabled = ${enabledFromEnv} (из .env)`
			)
		}

		// Создаем настройку bitrix24.webhook_url (если не существует)
		if (existingWebhook.length === 0) {
			let encryptedWebhook = ''

			// Шифруем webhook URL, если он установлен
			if (webhookFromEnv && process.env.JWT_SECRET) {
				try {
					encryptedWebhook = encrypt(webhookFromEnv)
					console.log('[Migration] Webhook URL зашифрован')
				} catch (error: any) {
					console.error(
						`[Migration] Ошибка шифрования webhook URL: ${error.message}`
					)
					console.warn('[Migration] Webhook URL будет сохранен как пустая строка')
				}
			}

			await queryRunner.query(
				`INSERT INTO settings (key, value, category, description, is_public, is_encrypted, validation, created_at, updated_at)
				VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
				[
					'bitrix24.webhook_url',
					JSON.stringify(encryptedWebhook),
					'bitrix',
					'Webhook URL для Bitrix24 REST API',
					false,
					true,
					JSON.stringify({
						type: 'string',
						pattern: '^https?://.*bitrix24\\.(ru|com|net|by|kz|ua)/rest/',
					}),
				]
			)
			console.log('[Migration] Создана настройка bitrix24.webhook_url (зашифрована)')
		}

		console.log('[Migration] ✅ Миграция настроек Bitrix24 завершена')
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// Удаляем созданные настройки при откате миграции
		await queryRunner.query(`DELETE FROM settings WHERE key = 'bitrix24.enabled'`)
		await queryRunner.query(`DELETE FROM settings WHERE key = 'bitrix24.webhook_url'`)

		console.log('[Migration] ⏪ Откат миграции настроек Bitrix24 выполнен')
	}
}
