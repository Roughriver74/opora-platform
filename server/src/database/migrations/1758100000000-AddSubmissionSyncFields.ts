import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSubmissionSyncFields1758100000000 implements MigrationInterface {
	name = 'AddSubmissionSyncFields1758100000000'

	public async up(queryRunner: QueryRunner): Promise<void> {
		// Добавляем поле для времени последней успешной синхронизации
		await queryRunner.query(`
			ALTER TABLE "submissions"
			ADD COLUMN IF NOT EXISTS "bitrix_synced_at" TIMESTAMP
		`)

		// Добавляем поле для количества попыток синхронизации
		await queryRunner.query(`
			ALTER TABLE "submissions"
			ADD COLUMN IF NOT EXISTS "bitrix_sync_attempts" INTEGER DEFAULT 0
		`)

		// Добавляем индекс для поиска заявок, которые нужно синхронизировать
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS "idx_submissions_sync_retry"
			ON "submissions" ("bitrix_sync_status", "bitrix_sync_attempts", "created_at")
			WHERE "bitrix_sync_status" IN ('pending', 'failed')
		`)

		// Обновляем значения для существующих записей
		await queryRunner.query(`
			UPDATE "submissions"
			SET "bitrix_synced_at" = "updated_at"
			WHERE "bitrix_sync_status" = 'synced' AND "bitrix_synced_at" IS NULL
		`)

		await queryRunner.query(`
			UPDATE "submissions"
			SET "bitrix_sync_attempts" = 1
			WHERE "bitrix_sync_status" = 'synced' AND "bitrix_sync_attempts" = 0
		`)

		await queryRunner.query(`
			UPDATE "submissions"
			SET "bitrix_sync_attempts" = 1
			WHERE "bitrix_sync_status" = 'failed' AND "bitrix_sync_attempts" = 0
		`)
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP INDEX IF EXISTS "idx_submissions_sync_retry"`)
		await queryRunner.query(`ALTER TABLE "submissions" DROP COLUMN IF EXISTS "bitrix_sync_attempts"`)
		await queryRunner.query(`ALTER TABLE "submissions" DROP COLUMN IF EXISTS "bitrix_synced_at"`)
	}
}
