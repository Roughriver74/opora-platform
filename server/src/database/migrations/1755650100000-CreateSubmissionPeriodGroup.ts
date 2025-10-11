import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm'

/**
 * Миграция для создания таблицы submission_period_groups
 * Хранит информацию о группах периодических заявок
 */
export class CreateSubmissionPeriodGroup1755650100000
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		// Создаем таблицу submission_period_groups
		await queryRunner.createTable(
			new Table({
				name: 'submission_period_groups',
				columns: [
					{
						name: 'id',
						type: 'uuid',
						isPrimary: true,
						default: 'uuid_generate_v4()',
					},
					{
						name: 'form_id',
						type: 'uuid',
						comment: 'ID формы',
					},
					{
						name: 'start_date',
						type: 'timestamp',
						comment: 'Начальная дата периода',
					},
					{
						name: 'end_date',
						type: 'timestamp',
						comment: 'Конечная дата периода',
					},
					{
						name: 'total_submissions',
						type: 'integer',
						default: 0,
						comment: 'Общее количество заявок в периоде',
					},
					{
						name: 'created_by_id',
						type: 'uuid',
						isNullable: true,
						comment: 'ID пользователя, создавшего период',
					},
					{
						name: 'status',
						type: 'varchar',
						length: '50',
						default: "'active'",
						comment: 'Статус группы периода (active, cancelled)',
					},
					{
						name: 'date_field_name',
						type: 'varchar',
						length: '255',
						comment: 'Имя поля с датой доставки в форме',
					},
					{
						name: 'metadata',
						type: 'jsonb',
						isNullable: true,
						comment: 'Дополнительные метаданные периода',
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

		// Создаем индексы для оптимизации запросов
		await queryRunner.createIndex(
			'submission_period_groups',
			new TableIndex({
				name: 'IDX_PERIOD_GROUPS_FORM',
				columnNames: ['form_id'],
			})
		)

		await queryRunner.createIndex(
			'submission_period_groups',
			new TableIndex({
				name: 'IDX_PERIOD_GROUPS_DATES',
				columnNames: ['start_date', 'end_date'],
			})
		)

		await queryRunner.createIndex(
			'submission_period_groups',
			new TableIndex({
				name: 'IDX_PERIOD_GROUPS_STATUS',
				columnNames: ['status'],
			})
		)

		await queryRunner.createIndex(
			'submission_period_groups',
			new TableIndex({
				name: 'IDX_PERIOD_GROUPS_CREATOR',
				columnNames: ['created_by_id'],
			})
		)

		// Создаем внешние ключи
		await queryRunner.createForeignKey(
			'submission_period_groups',
			new TableForeignKey({
				columnNames: ['form_id'],
				referencedTableName: 'forms',
				referencedColumnNames: ['id'],
				onDelete: 'CASCADE',
				name: 'FK_PERIOD_GROUPS_FORM',
			})
		)

		await queryRunner.createForeignKey(
			'submission_period_groups',
			new TableForeignKey({
				columnNames: ['created_by_id'],
				referencedTableName: 'users',
				referencedColumnNames: ['id'],
				onDelete: 'SET NULL',
				name: 'FK_PERIOD_GROUPS_USER',
			})
		)

		// Создаем внешний ключ от submissions к submission_period_groups
		await queryRunner.createForeignKey(
			'submissions',
			new TableForeignKey({
				columnNames: ['period_group_id'],
				referencedTableName: 'submission_period_groups',
				referencedColumnNames: ['id'],
				onDelete: 'CASCADE',
				name: 'FK_SUBMISSIONS_PERIOD_GROUP',
			})
		)
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// Удаляем внешний ключ от submissions
		await queryRunner.dropForeignKey('submissions', 'FK_SUBMISSIONS_PERIOD_GROUP')

		// Удаляем внешние ключи таблицы submission_period_groups
		await queryRunner.dropForeignKey('submission_period_groups', 'FK_PERIOD_GROUPS_USER')
		await queryRunner.dropForeignKey('submission_period_groups', 'FK_PERIOD_GROUPS_FORM')

		// Удаляем индексы
		await queryRunner.dropIndex('submission_period_groups', 'IDX_PERIOD_GROUPS_CREATOR')
		await queryRunner.dropIndex('submission_period_groups', 'IDX_PERIOD_GROUPS_STATUS')
		await queryRunner.dropIndex('submission_period_groups', 'IDX_PERIOD_GROUPS_DATES')
		await queryRunner.dropIndex('submission_period_groups', 'IDX_PERIOD_GROUPS_FORM')

		// Удаляем таблицу
		await queryRunner.dropTable('submission_period_groups')
	}
}
