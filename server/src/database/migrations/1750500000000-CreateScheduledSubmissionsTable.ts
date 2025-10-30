import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateScheduledSubmissionsTable1750500000000
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		// Создаем таблицу scheduled_submissions
		await queryRunner.createTable(
			new Table({
				name: 'scheduled_submissions',
				columns: [
					{
						name: 'id',
						type: 'uuid',
						isPrimary: true,
						default: 'uuid_generate_v4()',
					},
					{
						name: 'period_group_id',
						type: 'uuid',
						isNullable: true,
					},
					{
						name: 'form_id',
						type: 'uuid',
						isNullable: false,
					},
					{
						name: 'form_data',
						type: 'jsonb',
						isNullable: false,
					},
					{
						name: 'scheduled_date',
						type: 'date',
						isNullable: false,
					},
					{
						name: 'scheduled_time',
						type: 'time',
						isNullable: true,
					},
					{
						name: 'assigned_to_id',
						type: 'uuid',
						isNullable: true,
					},
					{
						name: 'status',
						type: 'enum',
						enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
						default: "'pending'",
					},
					{
						name: 'attempts',
						type: 'smallint',
						default: 0,
					},
					{
						name: 'error',
						type: 'text',
						isNullable: true,
					},
					{
						name: 'submission_id',
						type: 'uuid',
						isNullable: true,
					},
					{
						name: 'period_position',
						type: 'smallint',
						isNullable: true,
					},
					{
						name: 'total_in_period',
						type: 'smallint',
						isNullable: true,
					},
					{
						name: 'period_start_date',
						type: 'date',
						isNullable: true,
					},
					{
						name: 'period_end_date',
						type: 'date',
						isNullable: true,
					},
					{
						name: 'user_id',
						type: 'uuid',
						isNullable: true,
					},
					{
						name: 'user_name',
						type: 'varchar',
						length: '255',
						isNullable: true,
					},
					{
						name: 'user_email',
						type: 'varchar',
						length: '255',
						isNullable: true,
					},
					{
						name: 'form_name',
						type: 'varchar',
						length: '255',
						isNullable: true,
					},
					{
						name: 'form_title',
						type: 'varchar',
						length: '255',
						isNullable: true,
					},
					{
						name: 'priority',
						type: 'varchar',
						length: '50',
						isNullable: true,
					},
					{
						name: 'job_id',
						type: 'varchar',
						length: '255',
						isNullable: true,
					},
					{
						name: 'processed_at',
						type: 'timestamp',
						isNullable: true,
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
				foreignKeys: [
					{
						columnNames: ['period_group_id'],
						referencedTableName: 'submission_period_groups',
						referencedColumnNames: ['id'],
						onDelete: 'CASCADE',
					},
					{
						columnNames: ['form_id'],
						referencedTableName: 'forms',
						referencedColumnNames: ['id'],
						onDelete: 'CASCADE',
					},
					{
						columnNames: ['assigned_to_id'],
						referencedTableName: 'users',
						referencedColumnNames: ['id'],
						onDelete: 'SET NULL',
					},
					{
						columnNames: ['submission_id'],
						referencedTableName: 'submissions',
						referencedColumnNames: ['id'],
						onDelete: 'SET NULL',
					},
				],
			}),
			true
		)

		// Создаем индексы для оптимизации запросов
		await queryRunner.createIndex(
			'scheduled_submissions',
			new TableIndex({
				name: 'IDX_SCHEDULED_DATE_STATUS',
				columnNames: ['scheduled_date', 'status'],
			})
		)

		await queryRunner.createIndex(
			'scheduled_submissions',
			new TableIndex({
				name: 'IDX_PERIOD_GROUP_STATUS',
				columnNames: ['period_group_id', 'status'],
			})
		)

		await queryRunner.createIndex(
			'scheduled_submissions',
			new TableIndex({
				name: 'IDX_STATUS_SCHEDULED_DATE',
				columnNames: ['status', 'scheduled_date'],
			})
		)

		await queryRunner.createIndex(
			'scheduled_submissions',
			new TableIndex({
				name: 'IDX_FORM_STATUS',
				columnNames: ['form_id', 'status'],
			})
		)

		await queryRunner.createIndex(
			'scheduled_submissions',
			new TableIndex({
				name: 'IDX_ASSIGNED_TO_STATUS',
				columnNames: ['assigned_to_id', 'status'],
			})
		)

		// Добавляем триггер для обновления updated_at
		await queryRunner.query(`
			CREATE OR REPLACE FUNCTION update_scheduled_submissions_updated_at()
			RETURNS TRIGGER AS $$
			BEGIN
				NEW.updated_at = CURRENT_TIMESTAMP;
				RETURN NEW;
			END;
			$$ language 'plpgsql';
		`)

		await queryRunner.query(`
			CREATE TRIGGER update_scheduled_submissions_updated_at
			BEFORE UPDATE ON scheduled_submissions
			FOR EACH ROW EXECUTE PROCEDURE update_scheduled_submissions_updated_at();
		`)
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// Удаляем триггер
		await queryRunner.query(
			`DROP TRIGGER IF EXISTS update_scheduled_submissions_updated_at ON scheduled_submissions`
		)
		await queryRunner.query(
			`DROP FUNCTION IF EXISTS update_scheduled_submissions_updated_at()`
		)

		// Удаляем индексы
		await queryRunner.dropIndex(
			'scheduled_submissions',
			'IDX_SCHEDULED_DATE_STATUS'
		)
		await queryRunner.dropIndex(
			'scheduled_submissions',
			'IDX_PERIOD_GROUP_STATUS'
		)
		await queryRunner.dropIndex(
			'scheduled_submissions',
			'IDX_STATUS_SCHEDULED_DATE'
		)
		await queryRunner.dropIndex('scheduled_submissions', 'IDX_FORM_STATUS')
		await queryRunner.dropIndex(
			'scheduled_submissions',
			'IDX_ASSIGNED_TO_STATUS'
		)

		// Удаляем таблицу
		await queryRunner.dropTable('scheduled_submissions')
	}
}