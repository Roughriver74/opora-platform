import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm'

/**
 * Миграция для добавления поля is_active в таблицу form_fields
 * Позволяет скрывать поля от пользователей без фактического удаления
 */
export class AddIsActiveToFormFields1757900000000
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		// Добавляем колонку is_active с дефолтным значением true
		await queryRunner.addColumn(
			'form_fields',
			new TableColumn({
				name: 'is_active',
				type: 'boolean',
				default: true,
				comment: 'Флаг активности поля (true - показывается пользователям, false - скрыто)',
			})
		)

		// Создаем индекс для оптимизации запросов по активным полям
		await queryRunner.createIndex(
			'form_fields',
			new TableIndex({
				name: 'IDX_FORM_FIELDS_IS_ACTIVE',
				columnNames: ['is_active'],
			})
		)

		// Создаем составной индекс для быстрого поиска активных полей формы
		await queryRunner.createIndex(
			'form_fields',
			new TableIndex({
				name: 'IDX_FORM_FIELDS_FORM_ACTIVE',
				columnNames: ['form_id', 'is_active', 'order'],
			})
		)

		// Обновляем все существующие записи - устанавливаем is_active = true
		await queryRunner.query(`
			UPDATE form_fields
			SET is_active = true
			WHERE is_active IS NULL
		`)
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// Удаляем индексы
		await queryRunner.dropIndex('form_fields', 'IDX_FORM_FIELDS_FORM_ACTIVE')
		await queryRunner.dropIndex('form_fields', 'IDX_FORM_FIELDS_IS_ACTIVE')

		// Удаляем колонку
		await queryRunner.dropColumn('form_fields', 'is_active')
	}
}
