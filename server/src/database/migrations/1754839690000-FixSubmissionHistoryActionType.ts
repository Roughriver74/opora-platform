import { MigrationInterface, QueryRunner } from 'typeorm'

export class FixSubmissionHistoryActionType1754839690000 implements MigrationInterface {
    name = 'FixSubmissionHistoryActionType1754839690000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create the enum type if it doesn't exist
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE submission_history_actiontype_enum AS ENUM (
                    'create', 'update', 'status_change', 'assign', 'comment', 'sync_bitrix', 'delete'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `)

        // Add the new action_type column
        await queryRunner.query(`
            ALTER TABLE "submission_history" 
            ADD COLUMN "action_type" submission_history_actiontype_enum
        `)

        // Migrate existing data from 'action' to 'action_type'
        await queryRunner.query(`
            UPDATE "submission_history" 
            SET "action_type" = CASE 
                WHEN "action" = 'create' THEN 'create'::submission_history_actiontype_enum
                WHEN "action" = 'update' THEN 'update'::submission_history_actiontype_enum
                WHEN "action" = 'status_change' THEN 'status_change'::submission_history_actiontype_enum
                WHEN "action" = 'assign' THEN 'assign'::submission_history_actiontype_enum
                WHEN "action" = 'comment' THEN 'comment'::submission_history_actiontype_enum
                WHEN "action" = 'sync_bitrix' THEN 'sync_bitrix'::submission_history_actiontype_enum
                WHEN "action" = 'delete' THEN 'delete'::submission_history_actiontype_enum
                ELSE 'update'::submission_history_actiontype_enum
            END
        `)

        // Make the new column NOT NULL after data migration
        await queryRunner.query(`
            ALTER TABLE "submission_history" 
            ALTER COLUMN "action_type" SET NOT NULL
        `)

        // Add description column if it doesn't exist
        await queryRunner.query(`
            DO $$ BEGIN
                ALTER TABLE "submission_history" ADD COLUMN "description" text;
            EXCEPTION
                WHEN duplicate_column THEN null;
            END $$;
        `)

        // Update description from action if empty
        await queryRunner.query(`
            UPDATE "submission_history" 
            SET "description" = COALESCE("description", 
                CASE 
                    WHEN "action" = 'create' THEN 'Заявка создана'
                    WHEN "action" = 'update' THEN 'Заявка обновлена'
                    WHEN "action" = 'status_change' THEN 'Статус изменен'
                    WHEN "action" = 'assign' THEN 'Заявка назначена'
                    WHEN "action" = 'comment' THEN 'Добавлен комментарий'
                    WHEN "action" = 'sync_bitrix' THEN 'Синхронизация с Bitrix24'
                    WHEN "action" = 'delete' THEN 'Заявка удалена'
                    ELSE 'Действие выполнено'
                END
            )
            WHERE "description" IS NULL OR "description" = ''
        `)

        // Make description NOT NULL
        await queryRunner.query(`
            ALTER TABLE "submission_history" 
            ALTER COLUMN "description" SET NOT NULL
        `)

        // Add metadata column if it doesn't exist
        await queryRunner.query(`
            DO $$ BEGIN
                ALTER TABLE "submission_history" ADD COLUMN "metadata" jsonb;
            EXCEPTION
                WHEN duplicate_column THEN null;
            END $$;
        `)

        // Add index on action_type
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_submission_history_action_type" 
            ON "submission_history" ("action_type", "created_at")
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the index
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_submission_history_action_type"`)

        // Remove the new columns
        await queryRunner.query(`ALTER TABLE "submission_history" DROP COLUMN IF EXISTS "metadata"`)
        await queryRunner.query(`ALTER TABLE "submission_history" DROP COLUMN IF EXISTS "description"`)
        await queryRunner.query(`ALTER TABLE "submission_history" DROP COLUMN IF EXISTS "action_type"`)

        // Drop the enum type
        await queryRunner.query(`DROP TYPE IF EXISTS submission_history_actiontype_enum`)
    }
}