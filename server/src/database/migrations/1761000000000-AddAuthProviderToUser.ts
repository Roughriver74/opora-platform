import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAuthProviderToUser1761000000000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		// Create enum type
		await queryRunner.query(`
			DO $$ BEGIN
				CREATE TYPE "auth_provider_enum" AS ENUM ('local', 'google', 'yandex', 'vk');
			EXCEPTION
				WHEN duplicate_object THEN null;
			END $$;
		`)

		// Add auth_provider column
		await queryRunner.query(`
			ALTER TABLE "users"
			ADD COLUMN IF NOT EXISTS "auth_provider" "auth_provider_enum" NOT NULL DEFAULT 'local'
		`)

		// Add auth_provider_id column
		await queryRunner.query(`
			ALTER TABLE "users"
			ADD COLUMN IF NOT EXISTS "auth_provider_id" varchar(255) NULL
		`)

		// Make password nullable (for social auth users)
		await queryRunner.query(`
			ALTER TABLE "users"
			ALTER COLUMN "password" DROP NOT NULL
		`)

		// Add index for social auth lookups
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS "IDX_users_auth_provider" ON "users" ("auth_provider", "auth_provider_id")
		`)
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_auth_provider"`)
		await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "auth_provider_id"`)
		await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "auth_provider"`)
		await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password" SET NOT NULL`)
		await queryRunner.query(`DROP TYPE IF EXISTS "auth_provider_enum"`)
	}
}
