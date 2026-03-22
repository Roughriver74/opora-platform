import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateMultitenantFoundation1759000000000 implements MigrationInterface {
	name = 'CreateMultitenantFoundation1759000000000'

	public async up(queryRunner: QueryRunner): Promise<void> {
		// ============================================
		// 1. Создать таблицу organizations
		// ============================================
		await queryRunner.query(`
			CREATE TABLE "organizations" (
				"id" uuid NOT NULL DEFAULT gen_random_uuid(),
				"name" varchar(500) NOT NULL,
				"slug" varchar(100) NOT NULL,
				"inn" varchar(12),
				"is_active" boolean NOT NULL DEFAULT true,
				"settings" jsonb NOT NULL DEFAULT '{}',
				"subscription_plan" varchar(50),
				"subscription_expires_at" TIMESTAMP,
				"created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
				"updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
				CONSTRAINT "PK_organizations" PRIMARY KEY ("id"),
				CONSTRAINT "UQ_organizations_slug" UNIQUE ("slug")
			)
		`)
		await queryRunner.query(`CREATE INDEX "IDX_organizations_slug" ON "organizations" ("slug")`)
		await queryRunner.query(`CREATE INDEX "IDX_organizations_is_active" ON "organizations" ("is_active")`)

		// ============================================
		// 2. Создать enum organization_role и таблицу user_organizations
		// ============================================
		await queryRunner.query(`
			CREATE TYPE "organization_role_enum" AS ENUM ('org_admin', 'manager', 'distributor')
		`)

		await queryRunner.query(`
			CREATE TABLE "user_organizations" (
				"id" uuid NOT NULL DEFAULT gen_random_uuid(),
				"user_id" uuid NOT NULL,
				"organization_id" uuid NOT NULL,
				"role" "organization_role_enum" NOT NULL,
				"is_active" boolean NOT NULL DEFAULT true,
				"created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
				"updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
				CONSTRAINT "PK_user_organizations" PRIMARY KEY ("id"),
				CONSTRAINT "UQ_user_org" UNIQUE ("user_id", "organization_id"),
				CONSTRAINT "FK_user_org_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
				CONSTRAINT "FK_user_org_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
			)
		`)
		await queryRunner.query(`CREATE INDEX "IDX_user_org_user" ON "user_organizations" ("user_id")`)
		await queryRunner.query(`CREATE INDEX "IDX_user_org_org" ON "user_organizations" ("organization_id")`)
		await queryRunner.query(`CREATE INDEX "IDX_user_org_role" ON "user_organizations" ("role")`)

		// ============================================
		// 3. Добавить is_super_admin в users
		// ============================================
		await queryRunner.query(`
			ALTER TABLE "users" ADD COLUMN "is_super_admin" boolean NOT NULL DEFAULT false
		`)

		// ============================================
		// 4. Добавить organization_id во все таблицы (nullable на первом этапе)
		// ============================================

		// Forms
		await queryRunner.query(`ALTER TABLE "forms" ADD COLUMN "organization_id" uuid`)
		await queryRunner.query(`ALTER TABLE "forms" ADD CONSTRAINT "FK_forms_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")`)
		await queryRunner.query(`CREATE INDEX "IDX_forms_organization" ON "forms" ("organization_id")`)

		// Submissions
		await queryRunner.query(`ALTER TABLE "submissions" ADD COLUMN "organization_id" uuid`)
		await queryRunner.query(`ALTER TABLE "submissions" ADD CONSTRAINT "FK_submissions_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")`)
		await queryRunner.query(`CREATE INDEX "IDX_submissions_organization" ON "submissions" ("organization_id")`)

		// Companies
		await queryRunner.query(`ALTER TABLE "companies" ADD COLUMN "organization_id" uuid`)
		await queryRunner.query(`ALTER TABLE "companies" ADD CONSTRAINT "FK_companies_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")`)
		await queryRunner.query(`CREATE INDEX "IDX_companies_organization" ON "companies" ("organization_id")`)

		// Nomenclatures
		await queryRunner.query(`ALTER TABLE "nomenclatures" ADD COLUMN "organization_id" uuid`)
		await queryRunner.query(`ALTER TABLE "nomenclatures" ADD CONSTRAINT "FK_nomenclatures_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")`)
		await queryRunner.query(`CREATE INDEX "IDX_nomenclatures_organization" ON "nomenclatures" ("organization_id")`)

		// Nomenclature categories
		await queryRunner.query(`ALTER TABLE "nomenclature_categories" ADD COLUMN "organization_id" uuid`)
		await queryRunner.query(`ALTER TABLE "nomenclature_categories" ADD CONSTRAINT "FK_nom_categories_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")`)
		await queryRunner.query(`CREATE INDEX "IDX_nom_categories_organization" ON "nomenclature_categories" ("organization_id")`)

		// Settings
		await queryRunner.query(`ALTER TABLE "settings" ADD COLUMN "organization_id" uuid`)
		await queryRunner.query(`ALTER TABLE "settings" ADD CONSTRAINT "FK_settings_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")`)
		await queryRunner.query(`CREATE INDEX "IDX_settings_organization" ON "settings" ("organization_id")`)

		// Scheduled submissions
		await queryRunner.query(`ALTER TABLE "scheduled_submissions" ADD COLUMN "organization_id" uuid`)
		await queryRunner.query(`ALTER TABLE "scheduled_submissions" ADD CONSTRAINT "FK_scheduled_submissions_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")`)
		await queryRunner.query(`CREATE INDEX "IDX_scheduled_submissions_organization" ON "scheduled_submissions" ("organization_id")`)

		// Sync metadata
		await queryRunner.query(`ALTER TABLE "sync_metadata" ADD COLUMN "organization_id" uuid`)
		await queryRunner.query(`ALTER TABLE "sync_metadata" ADD CONSTRAINT "FK_sync_metadata_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")`)
		await queryRunner.query(`CREATE INDEX "IDX_sync_metadata_organization" ON "sync_metadata" ("organization_id")`)

		// ============================================
		// 5. Обновить уникальные индексы на составные (с organization_id)
		// ============================================

		// Forms: name -> (organization_id, name)
		await queryRunner.query(`ALTER TABLE "forms" DROP CONSTRAINT IF EXISTS "UQ_forms_name"`)
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_forms_name"`)
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_2c23c54c20b546fb1d5cc4e12e"`) // TypeORM auto-generated
		await queryRunner.query(`CREATE UNIQUE INDEX "UQ_forms_org_name" ON "forms" ("organization_id", "name") WHERE "organization_id" IS NOT NULL`)

		// Nomenclatures: sku -> (organization_id, sku)
		await queryRunner.query(`ALTER TABLE "nomenclatures" DROP CONSTRAINT IF EXISTS "UQ_nomenclatures_sku"`)
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_nomenclatures_sku"`)
		await queryRunner.query(`CREATE UNIQUE INDEX "UQ_nomenclatures_org_sku" ON "nomenclatures" ("organization_id", "sku") WHERE "organization_id" IS NOT NULL`)

		// Nomenclature categories: code -> (organization_id, code)
		await queryRunner.query(`ALTER TABLE "nomenclature_categories" DROP CONSTRAINT IF EXISTS "UQ_nomenclature_categories_code"`)
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_nomenclature_categories_code"`)
		await queryRunner.query(`CREATE UNIQUE INDEX "UQ_nom_categories_org_code" ON "nomenclature_categories" ("organization_id", "code") WHERE "organization_id" IS NOT NULL`)
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// Удалить составные уникальные индексы
		await queryRunner.query(`DROP INDEX IF EXISTS "UQ_nom_categories_org_code"`)
		await queryRunner.query(`DROP INDEX IF EXISTS "UQ_nomenclatures_org_sku"`)
		await queryRunner.query(`DROP INDEX IF EXISTS "UQ_forms_org_name"`)

		// Удалить organization_id из всех таблиц
		const tables = [
			'sync_metadata',
			'scheduled_submissions',
			'settings',
			'nomenclature_categories',
			'nomenclatures',
			'companies',
			'submissions',
			'forms',
		]

		for (const table of tables) {
			await queryRunner.query(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "FK_${table}_organization"`)
			await queryRunner.query(`DROP INDEX IF EXISTS "IDX_${table}_organization"`)
			await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "organization_id"`)
		}

		// Специальные FK names
		await queryRunner.query(`ALTER TABLE "nomenclature_categories" DROP CONSTRAINT IF EXISTS "FK_nom_categories_organization"`)
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_nom_categories_organization"`)
		await queryRunner.query(`ALTER TABLE "scheduled_submissions" DROP CONSTRAINT IF EXISTS "FK_scheduled_submissions_organization"`)
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_scheduled_submissions_organization"`)

		// Удалить is_super_admin из users
		await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "is_super_admin"`)

		// Удалить user_organizations
		await queryRunner.query(`DROP TABLE IF EXISTS "user_organizations"`)
		await queryRunner.query(`DROP TYPE IF EXISTS "organization_role_enum"`)

		// Удалить organizations
		await queryRunner.query(`DROP TABLE IF EXISTS "organizations"`)
	}
}
