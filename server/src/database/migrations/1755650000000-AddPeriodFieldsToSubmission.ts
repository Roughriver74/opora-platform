import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm'

/**
 * Миграция для добавления полей периода в таблицу submissions
 * Позволяет создавать группы заявок на период дат
 */
export class AddPeriodFieldsToSubmission1755650000000
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		// Добавляем поля для работы с периодическими заявками
		await queryRunner.addColumns('submissions', [
			new TableColumn({
				name: 'is_period_submission',
				type: 'boolean',
				default: false,
				comment: 'Флаг периодической заявки',
			}),
			new TableColumn({
				name: 'period_group_id',
				type: 'uuid',
				isNullable: true,
				comment: 'ID группы периода для связи заявок',
			}),
			new TableColumn({
				name: 'period_start_date',
				type: 'timestamp',
				isNullable: true,
				comment: 'Начальная дата периода',
			}),
			new TableColumn({
				name: 'period_end_date',
				type: 'timestamp',
				isNullable: true,
				comment: 'Конечная дата периода',
			}),
			new TableColumn({
				name: 'period_position',
				type: 'integer',
				isNullable: true,
				comment: 'Порядковый номер заявки в периоде (1, 2, 3...)',
			}),
			new TableColumn({
				name: 'total_in_period',
				type: 'integer',
				isNullable: true,
				comment: 'Общее количество заявок в периоде',
			}),
		])

		// Создаем индекс для быстрого поиска заявок периода
		await queryRunner.createIndex(
			'submissions',
			new TableIndex({
				name: 'IDX_SUBMISSIONS_PERIOD_GROUP',
				columnNames: ['period_group_id'],
			})
		)

		// Создаем составной индекс для периодических заявок
		await queryRunner.createIndex(
			'submissions',
			new TableIndex({
				name: 'IDX_SUBMISSIONS_PERIOD_FLAGS',
				columnNames: ['is_period_submission', 'period_group_id'],
			})
		)

		// Создаем индекс для поиска по датам периода
		await queryRunner.createIndex(
			'submissions',
			new TableIndex({
				name: 'IDX_SUBMISSIONS_PERIOD_DATES',
				columnNames: ['period_start_date', 'period_end_date'],
			})
		)
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// Удаляем индексы
		await queryRunner.dropIndex('submissions', 'IDX_SUBMISSIONS_PERIOD_DATES')
		await queryRunner.dropIndex('submissions', 'IDX_SUBMISSIONS_PERIOD_FLAGS')
		await queryRunner.dropIndex('submissions', 'IDX_SUBMISSIONS_PERIOD_GROUP')

		// Удаляем колонки
		await queryRunner.dropColumn('submissions', 'total_in_period')
		await queryRunner.dropColumn('submissions', 'period_position')
		await queryRunner.dropColumn('submissions', 'period_end_date')
		await queryRunner.dropColumn('submissions', 'period_start_date')
		await queryRunner.dropColumn('submissions', 'period_group_id')
		await queryRunner.dropColumn('submissions', 'is_period_submission')
	}
}
