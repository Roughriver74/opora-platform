import {
	MigrationInterface,
	QueryRunner,
	Table,
	TableIndex,
	TableForeignKey,
} from 'typeorm'

/**
 * Миграция для создания таблицы визитов (visits).
 *
 * Включает:
 * - Enum типы visit_status и visit_sync_status
 * - Таблицу visits со всеми полями
 * - Индексы по organization_id, user_id, company_id, date, status
 * - Внешние ключи к organizations, companies, users (ON DELETE CASCADE)
 */
export class CreateVisitsTable1760000000000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		// 1. Создаем enum типы
		await queryRunner.query(`
			DO $$ BEGIN
				CREATE TYPE visit_status AS ENUM ('planned', 'completed', 'cancelled', 'failed');
			EXCEPTION
				WHEN duplicate_object THEN null;
			END $$;
		`)

		await queryRunner.query(`
			DO $$ BEGIN
				CREATE TYPE visit_sync_status AS ENUM ('none', 'pending', 'synced', 'error');
			EXCEPTION
				WHEN duplicate_object THEN null;
			END $$;
		`)

		// 2. Создаем таблицу visits
		await queryRunner.createTable(
			new Table({
				name: 'visits',
				columns: [
					{
						name: 'id',
						type: 'uuid',
						isPrimary: true,
						default: 'uuid_generate_v4()',
					},
					{
						name: 'organization_id',
						type: 'uuid',
						comment: 'ID организации',
					},
					{
						name: 'company_id',
						type: 'uuid',
						comment: 'ID компании (контрагента)',
					},
					{
						name: 'contact_id',
						type: 'uuid',
						isNullable: true,
						comment: 'ID контакта (необязательно)',
					},
					{
						name: 'user_id',
						type: 'uuid',
						comment: 'ID пользователя (менеджера)',
					},
					{
						name: 'date',
						type: 'timestamp',
						comment: 'Дата и время визита',
					},
					{
						name: 'status',
						type: 'visit_status',
						default: "'planned'",
						comment: 'Статус визита',
					},
					{
						name: 'visit_type',
						type: 'varchar',
						length: '255',
						isNullable: true,
						comment: 'Тип визита',
					},
					{
						name: 'comment',
						type: 'text',
						isNullable: true,
						comment: 'Комментарий',
					},
					{
						name: 'dynamic_fields',
						type: 'jsonb',
						default: "'{}'",
						comment: 'Динамические поля',
					},
					{
						name: 'bitrix_id',
						type: 'varchar',
						length: '100',
						isNullable: true,
						comment: 'ID в Bitrix24',
					},
					{
						name: 'sync_status',
						type: 'visit_sync_status',
						default: "'none'",
						comment: 'Статус синхронизации с Bitrix24',
					},
					{
						name: 'last_synced',
						type: 'timestamp',
						isNullable: true,
						comment: 'Дата последней синхронизации',
					},
					{
						name: 'user_name',
						type: 'varchar',
						length: '255',
						isNullable: true,
						comment: 'Денормализованное имя пользователя',
					},
					{
						name: 'company_name',
						type: 'varchar',
						length: '500',
						isNullable: true,
						comment: 'Денормализованное название компании',
					},
					{
						name: 'created_at',
						type: 'timestamp',
						default: 'CURRENT_TIMESTAMP',
					},
					{
						name: 'updated_at',
						type: 'timestamp',
						default: 'CURRENT_TIMESTAMP',
					},
				],
			}),
			true
		)

		// 3. Создаем индексы
		await queryRunner.createIndex(
			'visits',
			new TableIndex({
				name: 'IDX_VISITS_ORGANIZATION_ID',
				columnNames: ['organization_id'],
			})
		)

		await queryRunner.createIndex(
			'visits',
			new TableIndex({
				name: 'IDX_VISITS_USER_ID',
				columnNames: ['user_id'],
			})
		)

		await queryRunner.createIndex(
			'visits',
			new TableIndex({
				name: 'IDX_VISITS_COMPANY_ID',
				columnNames: ['company_id'],
			})
		)

		await queryRunner.createIndex(
			'visits',
			new TableIndex({
				name: 'IDX_VISITS_DATE',
				columnNames: ['date'],
			})
		)

		await queryRunner.createIndex(
			'visits',
			new TableIndex({
				name: 'IDX_VISITS_STATUS',
				columnNames: ['status'],
			})
		)

		// 4. Создаем внешние ключи
		await queryRunner.createForeignKey(
			'visits',
			new TableForeignKey({
				name: 'FK_VISITS_ORGANIZATION',
				columnNames: ['organization_id'],
				referencedTableName: 'organizations',
				referencedColumnNames: ['id'],
				onDelete: 'CASCADE',
			})
		)

		await queryRunner.createForeignKey(
			'visits',
			new TableForeignKey({
				name: 'FK_VISITS_COMPANY',
				columnNames: ['company_id'],
				referencedTableName: 'companies',
				referencedColumnNames: ['id'],
				onDelete: 'CASCADE',
			})
		)

		await queryRunner.createForeignKey(
			'visits',
			new TableForeignKey({
				name: 'FK_VISITS_USER',
				columnNames: ['user_id'],
				referencedTableName: 'users',
				referencedColumnNames: ['id'],
				onDelete: 'CASCADE',
			})
		)
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// Удаляем внешние ключи
		await queryRunner.dropForeignKey('visits', 'FK_VISITS_USER')
		await queryRunner.dropForeignKey('visits', 'FK_VISITS_COMPANY')
		await queryRunner.dropForeignKey('visits', 'FK_VISITS_ORGANIZATION')

		// Удаляем индексы
		await queryRunner.dropIndex('visits', 'IDX_VISITS_STATUS')
		await queryRunner.dropIndex('visits', 'IDX_VISITS_DATE')
		await queryRunner.dropIndex('visits', 'IDX_VISITS_COMPANY_ID')
		await queryRunner.dropIndex('visits', 'IDX_VISITS_USER_ID')
		await queryRunner.dropIndex('visits', 'IDX_VISITS_ORGANIZATION_ID')

		// Удаляем таблицу
		await queryRunner.dropTable('visits')

		// Удаляем enum типы
		await queryRunner.query(`DROP TYPE IF EXISTS visit_sync_status;`)
		await queryRunner.query(`DROP TYPE IF EXISTS visit_status;`)
	}
}
