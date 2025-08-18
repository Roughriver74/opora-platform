import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddFormDataColumn1755554000000 implements MigrationInterface {
    name = 'AddFormDataColumn1755554000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if the table and column already exist
        const tableExists = await queryRunner.hasTable('submissions')
        if (!tableExists) {
            return // Table doesn't exist, skip migration
        }

        const hasFormData = await queryRunner.hasColumn('submissions', 'form_data')
        if (hasFormData) {
            return // Column already exists, skip migration
        }

        // Add the form_data column as jsonb
        await queryRunner.query(`
            ALTER TABLE "submissions" ADD COLUMN "form_data" jsonb DEFAULT '{}'::jsonb NOT NULL
        `)

        // Add index on form_data for better query performance
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_submissions_form_data" 
            ON "submissions" USING gin ("form_data")
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the index
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_submissions_form_data"`)
        
        // Remove the form_data column
        await queryRunner.query(`ALTER TABLE "submissions" DROP COLUMN IF EXISTS "form_data"`)
    }
}