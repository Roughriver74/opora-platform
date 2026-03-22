import {
	MigrationInterface,
	QueryRunner,
	Table,
	TableIndex,
	TableForeignKey,
} from 'typeorm'

/**
 * Миграция для создания таблиц номенклатуры:
 * - nomenclature_units (единицы измерения)
 * - nomenclature_categories (категории)
 * - nomenclatures (основная таблица номенклатуры)
 *
 * Включает:
 * - Полнотекстовый поиск через tsvector
 * - Нечеткий поиск через pg_trgm
 * - Индексы для быстрого поиска
 * - Связь с Bitrix24 через bitrixProductId
 */
export class CreateNomenclatureTables1758000000000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		// 1. Создаем расширения для полнотекстового и нечеткого поиска
		await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`)
		await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`)

		// 2. Создаем enum типы
		await queryRunner.query(`
			DO $$ BEGIN
				CREATE TYPE nomenclature_type AS ENUM ('product', 'service', 'material');
			EXCEPTION
				WHEN duplicate_object THEN null;
			END $$;
		`)

		await queryRunner.query(`
			DO $$ BEGIN
				CREATE TYPE nomenclature_sync_status AS ENUM ('synced', 'pending', 'error', 'local_only');
			EXCEPTION
				WHEN duplicate_object THEN null;
			END $$;
		`)

		// 3. Создаем таблицу единиц измерения
		await queryRunner.createTable(
			new Table({
				name: 'nomenclature_units',
				columns: [
					{
						name: 'id',
						type: 'uuid',
						isPrimary: true,
						default: 'uuid_generate_v4()',
					},
					{
						name: 'code',
						type: 'varchar',
						length: '50',
						isUnique: true,
						comment: 'Уникальный код единицы (m3, t, pcs)',
					},
					{
						name: 'name',
						type: 'varchar',
						length: '100',
						comment: 'Полное название (Кубический метр)',
					},
					{
						name: 'short_name',
						type: 'varchar',
						length: '20',
						comment: 'Сокращение (м³)',
					},
					{
						name: 'okei_code',
						type: 'int',
						isNullable: true,
						comment: 'Код по ОКЕИ',
					},
					{
						name: 'is_active',
						type: 'boolean',
						default: true,
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

		// 4. Создаем таблицу категорий
		await queryRunner.createTable(
			new Table({
				name: 'nomenclature_categories',
				columns: [
					{
						name: 'id',
						type: 'uuid',
						isPrimary: true,
						default: 'uuid_generate_v4()',
					},
					{
						name: 'code',
						type: 'varchar',
						length: '100',
						isUnique: true,
						comment: 'Уникальный код категории',
					},
					{
						name: 'name',
						type: 'varchar',
						length: '255',
						comment: 'Название категории',
					},
					{
						name: 'description',
						type: 'text',
						isNullable: true,
					},
					{
						name: 'parent_id',
						type: 'uuid',
						isNullable: true,
						comment: 'ID родительской категории',
					},
					{
						name: 'sort_order',
						type: 'int',
						default: 0,
					},
					{
						name: 'is_active',
						type: 'boolean',
						default: true,
					},
					{
						name: 'bitrix_section_id',
						type: 'varchar',
						length: '100',
						isNullable: true,
						comment: 'ID раздела в Bitrix24',
					},
					{
						name: 'last_sync_at',
						type: 'timestamp',
						isNullable: true,
					},
					{
						name: 'created_by',
						type: 'uuid',
						isNullable: true,
					},
					{
						name: 'updated_by',
						type: 'uuid',
						isNullable: true,
					},
					{
						name: 'change_history',
						type: 'jsonb',
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
			}),
			true
		)

		// 5. Создаем основную таблицу номенклатуры
		await queryRunner.createTable(
			new Table({
				name: 'nomenclatures',
				columns: [
					{
						name: 'id',
						type: 'uuid',
						isPrimary: true,
						default: 'uuid_generate_v4()',
					},
					{
						name: 'sku',
						type: 'varchar',
						length: '100',
						isUnique: true,
						comment: 'Артикул/SKU - уникальный код товара',
					},
					{
						name: 'name',
						type: 'varchar',
						length: '500',
						comment: 'Название товара',
					},
					{
						name: 'description',
						type: 'text',
						isNullable: true,
					},
					{
						name: 'type',
						type: 'nomenclature_type',
						default: "'product'",
					},
					{
						name: 'category_id',
						type: 'uuid',
						isNullable: true,
					},
					{
						name: 'unit_id',
						type: 'uuid',
						comment: 'ID единицы измерения',
					},
					{
						name: 'price',
						type: 'decimal',
						precision: 15,
						scale: 2,
						isNullable: true,
						comment: 'Базовая цена',
					},
					{
						name: 'currency',
						type: 'varchar',
						length: '10',
						default: "'RUB'",
					},
					{
						name: 'cost_price',
						type: 'decimal',
						precision: 15,
						scale: 2,
						isNullable: true,
						comment: 'Себестоимость',
					},
					{
						name: 'bitrix_product_id',
						type: 'varchar',
						length: '50',
						isNullable: true,
						comment: 'ID товара в Bitrix24',
					},
					{
						name: 'bitrix_section_id',
						type: 'varchar',
						length: '50',
						isNullable: true,
						comment: 'ID раздела в Bitrix24',
					},
					{
						name: 'sync_status',
						type: 'nomenclature_sync_status',
						default: "'local_only'",
					},
					{
						name: 'last_sync_at',
						type: 'timestamp',
						isNullable: true,
					},
					{
						name: 'sync_error',
						type: 'jsonb',
						isNullable: true,
						comment: 'Информация об ошибке синхронизации',
					},
					{
						name: 'attributes',
						type: 'jsonb',
						isNullable: true,
						comment: 'Дополнительные атрибуты (марка, класс и т.д.)',
					},
					{
						name: 'tags',
						type: 'varchar[]',
						default: "ARRAY[]::varchar[]",
						comment: 'Теги для поиска',
					},
					{
						name: 'image_url',
						type: 'varchar',
						length: '500',
						isNullable: true,
					},
					{
						name: 'sort_order',
						type: 'int',
						default: 0,
					},
					{
						name: 'is_active',
						type: 'boolean',
						default: true,
					},
					{
						name: 'search_vector',
						type: 'tsvector',
						isNullable: true,
						comment: 'Вектор для полнотекстового поиска',
					},
					{
						name: 'created_by',
						type: 'uuid',
						isNullable: true,
					},
					{
						name: 'updated_by',
						type: 'uuid',
						isNullable: true,
					},
					{
						name: 'change_history',
						type: 'jsonb',
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
			}),
			true
		)

		// 6. Создаем индексы для nomenclature_units
		await queryRunner.createIndex(
			'nomenclature_units',
			new TableIndex({
				name: 'IDX_NOMENCLATURE_UNITS_CODE',
				columnNames: ['code'],
				isUnique: true,
			})
		)

		await queryRunner.createIndex(
			'nomenclature_units',
			new TableIndex({
				name: 'IDX_NOMENCLATURE_UNITS_ACTIVE',
				columnNames: ['is_active'],
			})
		)

		// 7. Создаем индексы для nomenclature_categories
		await queryRunner.createIndex(
			'nomenclature_categories',
			new TableIndex({
				name: 'IDX_NOMENCLATURE_CATEGORIES_CODE',
				columnNames: ['code'],
				isUnique: true,
			})
		)

		await queryRunner.createIndex(
			'nomenclature_categories',
			new TableIndex({
				name: 'IDX_NOMENCLATURE_CATEGORIES_PARENT',
				columnNames: ['parent_id'],
			})
		)

		await queryRunner.createIndex(
			'nomenclature_categories',
			new TableIndex({
				name: 'IDX_NOMENCLATURE_CATEGORIES_ACTIVE',
				columnNames: ['is_active'],
			})
		)

		await queryRunner.createIndex(
			'nomenclature_categories',
			new TableIndex({
				name: 'IDX_NOMENCLATURE_CATEGORIES_BITRIX',
				columnNames: ['bitrix_section_id'],
			})
		)

		// 8. Создаем индексы для nomenclatures
		await queryRunner.createIndex(
			'nomenclatures',
			new TableIndex({
				name: 'IDX_NOMENCLATURES_SKU',
				columnNames: ['sku'],
				isUnique: true,
			})
		)

		await queryRunner.createIndex(
			'nomenclatures',
			new TableIndex({
				name: 'IDX_NOMENCLATURES_CATEGORY',
				columnNames: ['category_id'],
			})
		)

		await queryRunner.createIndex(
			'nomenclatures',
			new TableIndex({
				name: 'IDX_NOMENCLATURES_UNIT',
				columnNames: ['unit_id'],
			})
		)

		await queryRunner.createIndex(
			'nomenclatures',
			new TableIndex({
				name: 'IDX_NOMENCLATURES_ACTIVE',
				columnNames: ['is_active'],
			})
		)

		await queryRunner.createIndex(
			'nomenclatures',
			new TableIndex({
				name: 'IDX_NOMENCLATURES_TYPE',
				columnNames: ['type'],
			})
		)

		await queryRunner.createIndex(
			'nomenclatures',
			new TableIndex({
				name: 'IDX_NOMENCLATURES_SYNC_STATUS',
				columnNames: ['sync_status'],
			})
		)

		await queryRunner.createIndex(
			'nomenclatures',
			new TableIndex({
				name: 'IDX_NOMENCLATURES_ACTIVE_TYPE',
				columnNames: ['is_active', 'type'],
			})
		)

		// 9. Создаем частичный уникальный индекс для bitrix_product_id
		await queryRunner.query(`
			CREATE UNIQUE INDEX "IDX_NOMENCLATURES_BITRIX_ID"
			ON "nomenclatures" ("bitrix_product_id")
			WHERE "bitrix_product_id" IS NOT NULL;
		`)

		// 10. Создаем GIN индекс для полнотекстового поиска (tsvector)
		await queryRunner.query(`
			CREATE INDEX "IDX_NOMENCLATURES_SEARCH_VECTOR"
			ON "nomenclatures" USING GIN("search_vector");
		`)

		// 11. Создаем GIN индекс для триграммного (нечеткого) поиска
		await queryRunner.query(`
			CREATE INDEX "IDX_NOMENCLATURES_NAME_TRGM"
			ON "nomenclatures" USING GIN(name gin_trgm_ops);
		`)

		// 12. Создаем триггер для автоматического обновления search_vector
		await queryRunner.query(`
			CREATE OR REPLACE FUNCTION nomenclature_search_vector_update() RETURNS trigger AS $$
			BEGIN
				NEW.search_vector :=
					setweight(to_tsvector('russian', COALESCE(NEW.name, '')), 'A') ||
					setweight(to_tsvector('russian', COALESCE(NEW.sku, '')), 'A') ||
					setweight(to_tsvector('russian', COALESCE(NEW.description, '')), 'B') ||
					setweight(to_tsvector('russian', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
				RETURN NEW;
			END;
			$$ LANGUAGE plpgsql;
		`)

		await queryRunner.query(`
			CREATE TRIGGER nomenclature_search_vector_trigger
			BEFORE INSERT OR UPDATE ON nomenclatures
			FOR EACH ROW EXECUTE FUNCTION nomenclature_search_vector_update();
		`)

		// 13. Создаем внешние ключи
		await queryRunner.createForeignKey(
			'nomenclature_categories',
			new TableForeignKey({
				columnNames: ['parent_id'],
				referencedTableName: 'nomenclature_categories',
				referencedColumnNames: ['id'],
				onDelete: 'SET NULL',
				name: 'FK_NOMENCLATURE_CATEGORIES_PARENT',
			})
		)

		await queryRunner.createForeignKey(
			'nomenclature_categories',
			new TableForeignKey({
				columnNames: ['created_by'],
				referencedTableName: 'users',
				referencedColumnNames: ['id'],
				onDelete: 'SET NULL',
				name: 'FK_NOMENCLATURE_CATEGORIES_CREATOR',
			})
		)

		await queryRunner.createForeignKey(
			'nomenclature_categories',
			new TableForeignKey({
				columnNames: ['updated_by'],
				referencedTableName: 'users',
				referencedColumnNames: ['id'],
				onDelete: 'SET NULL',
				name: 'FK_NOMENCLATURE_CATEGORIES_UPDATER',
			})
		)

		await queryRunner.createForeignKey(
			'nomenclatures',
			new TableForeignKey({
				columnNames: ['category_id'],
				referencedTableName: 'nomenclature_categories',
				referencedColumnNames: ['id'],
				onDelete: 'SET NULL',
				name: 'FK_NOMENCLATURES_CATEGORY',
			})
		)

		await queryRunner.createForeignKey(
			'nomenclatures',
			new TableForeignKey({
				columnNames: ['unit_id'],
				referencedTableName: 'nomenclature_units',
				referencedColumnNames: ['id'],
				onDelete: 'RESTRICT',
				name: 'FK_NOMENCLATURES_UNIT',
			})
		)

		await queryRunner.createForeignKey(
			'nomenclatures',
			new TableForeignKey({
				columnNames: ['created_by'],
				referencedTableName: 'users',
				referencedColumnNames: ['id'],
				onDelete: 'SET NULL',
				name: 'FK_NOMENCLATURES_CREATOR',
			})
		)

		await queryRunner.createForeignKey(
			'nomenclatures',
			new TableForeignKey({
				columnNames: ['updated_by'],
				referencedTableName: 'users',
				referencedColumnNames: ['id'],
				onDelete: 'SET NULL',
				name: 'FK_NOMENCLATURES_UPDATER',
			})
		)

		// 14. Заполняем базовые единицы измерения
		await queryRunner.query(`
			INSERT INTO nomenclature_units (code, name, short_name, okei_code) VALUES
			('m3', 'Кубический метр', 'м³', 113),
			('t', 'Тонна', 'т', 168),
			('pcs', 'Штука', 'шт', 796),
			('l', 'Литр', 'л', 112),
			('kg', 'Килограмм', 'кг', 166),
			('m', 'Метр', 'м', 6),
			('m2', 'Квадратный метр', 'м²', 55),
			('hour', 'Час', 'ч', 356),
			('set', 'Комплект', 'компл', 839),
			('service', 'Услуга', 'усл', 876);
		`)

		// 15. Базовые категории создаются через админ-панель организации
		// Бетонные категории (BETON, RASTVORY и т.д.) были удалены при универсализации платформы
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// Удаляем триггер и функцию
		await queryRunner.query(`DROP TRIGGER IF EXISTS nomenclature_search_vector_trigger ON nomenclatures;`)
		await queryRunner.query(`DROP FUNCTION IF EXISTS nomenclature_search_vector_update();`)

		// Удаляем внешние ключи nomenclatures
		await queryRunner.dropForeignKey('nomenclatures', 'FK_NOMENCLATURES_UPDATER')
		await queryRunner.dropForeignKey('nomenclatures', 'FK_NOMENCLATURES_CREATOR')
		await queryRunner.dropForeignKey('nomenclatures', 'FK_NOMENCLATURES_UNIT')
		await queryRunner.dropForeignKey('nomenclatures', 'FK_NOMENCLATURES_CATEGORY')

		// Удаляем внешние ключи nomenclature_categories
		await queryRunner.dropForeignKey('nomenclature_categories', 'FK_NOMENCLATURE_CATEGORIES_UPDATER')
		await queryRunner.dropForeignKey('nomenclature_categories', 'FK_NOMENCLATURE_CATEGORIES_CREATOR')
		await queryRunner.dropForeignKey('nomenclature_categories', 'FK_NOMENCLATURE_CATEGORIES_PARENT')

		// Удаляем специальные индексы
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_NOMENCLATURES_NAME_TRGM";`)
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_NOMENCLATURES_SEARCH_VECTOR";`)
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_NOMENCLATURES_BITRIX_ID";`)

		// Удаляем обычные индексы nomenclatures
		await queryRunner.dropIndex('nomenclatures', 'IDX_NOMENCLATURES_ACTIVE_TYPE')
		await queryRunner.dropIndex('nomenclatures', 'IDX_NOMENCLATURES_SYNC_STATUS')
		await queryRunner.dropIndex('nomenclatures', 'IDX_NOMENCLATURES_TYPE')
		await queryRunner.dropIndex('nomenclatures', 'IDX_NOMENCLATURES_ACTIVE')
		await queryRunner.dropIndex('nomenclatures', 'IDX_NOMENCLATURES_UNIT')
		await queryRunner.dropIndex('nomenclatures', 'IDX_NOMENCLATURES_CATEGORY')
		await queryRunner.dropIndex('nomenclatures', 'IDX_NOMENCLATURES_SKU')

		// Удаляем индексы nomenclature_categories
		await queryRunner.dropIndex('nomenclature_categories', 'IDX_NOMENCLATURE_CATEGORIES_BITRIX')
		await queryRunner.dropIndex('nomenclature_categories', 'IDX_NOMENCLATURE_CATEGORIES_ACTIVE')
		await queryRunner.dropIndex('nomenclature_categories', 'IDX_NOMENCLATURE_CATEGORIES_PARENT')
		await queryRunner.dropIndex('nomenclature_categories', 'IDX_NOMENCLATURE_CATEGORIES_CODE')

		// Удаляем индексы nomenclature_units
		await queryRunner.dropIndex('nomenclature_units', 'IDX_NOMENCLATURE_UNITS_ACTIVE')
		await queryRunner.dropIndex('nomenclature_units', 'IDX_NOMENCLATURE_UNITS_CODE')

		// Удаляем таблицы
		await queryRunner.dropTable('nomenclatures')
		await queryRunner.dropTable('nomenclature_categories')
		await queryRunner.dropTable('nomenclature_units')

		// Удаляем enum типы
		await queryRunner.query(`DROP TYPE IF EXISTS nomenclature_sync_status;`)
		await queryRunner.query(`DROP TYPE IF EXISTS nomenclature_type;`)
	}
}
