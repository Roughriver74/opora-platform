import {
	MigrationInterface,
	QueryRunner,
	Table,
	TableIndex,
	TableForeignKey,
} from 'typeorm'

/**
 * Миграция для создания таблиц контрагентов:
 * - companies (компании)
 * - contacts (контакты)
 *
 * Включает:
 * - Полнотекстовый поиск через tsvector
 * - Нечеткий поиск через pg_trgm
 * - Индексы для быстрого поиска по ИНН, телефону, email
 * - Связь с Bitrix24 через bitrixCompanyId/bitrixContactId
 */
export class CreateCompanyContactTables1758100000000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		// 1. Создаем enum типы для компаний
		await queryRunner.query(`
			DO $$ BEGIN
				CREATE TYPE company_type AS ENUM ('customer', 'supplier', 'partner', 'contractor', 'other');
			EXCEPTION
				WHEN duplicate_object THEN null;
			END $$;
		`)

		await queryRunner.query(`
			DO $$ BEGIN
				CREATE TYPE company_sync_status AS ENUM ('synced', 'pending', 'error', 'local_only');
			EXCEPTION
				WHEN duplicate_object THEN null;
			END $$;
		`)

		// 2. Создаем enum типы для контактов
		await queryRunner.query(`
			DO $$ BEGIN
				CREATE TYPE contact_type AS ENUM ('decision_maker', 'manager', 'accountant', 'director', 'dispatcher', 'other');
			EXCEPTION
				WHEN duplicate_object THEN null;
			END $$;
		`)

		await queryRunner.query(`
			DO $$ BEGIN
				CREATE TYPE contact_sync_status AS ENUM ('synced', 'pending', 'error', 'local_only');
			EXCEPTION
				WHEN duplicate_object THEN null;
			END $$;
		`)

		// 3. Создаем таблицу компаний
		await queryRunner.createTable(
			new Table({
				name: 'companies',
				columns: [
					{
						name: 'id',
						type: 'uuid',
						isPrimary: true,
						default: 'uuid_generate_v4()',
					},
					{
						name: 'name',
						type: 'varchar',
						length: '500',
						comment: 'Полное название компании',
					},
					{
						name: 'short_name',
						type: 'varchar',
						length: '255',
						isNullable: true,
						comment: 'Краткое название',
					},
					{
						name: 'inn',
						type: 'varchar',
						length: '12',
						isNullable: true,
						comment: 'ИНН (10 или 12 цифр)',
					},
					{
						name: 'kpp',
						type: 'varchar',
						length: '9',
						isNullable: true,
						comment: 'КПП (9 цифр)',
					},
					{
						name: 'ogrn',
						type: 'varchar',
						length: '15',
						isNullable: true,
						comment: 'ОГРН (13 или 15 цифр)',
					},
					{
						name: 'legal_address',
						type: 'text',
						isNullable: true,
						comment: 'Юридический адрес',
					},
					{
						name: 'actual_address',
						type: 'text',
						isNullable: true,
						comment: 'Фактический адрес',
					},
					{
						name: 'postal_address',
						type: 'text',
						isNullable: true,
						comment: 'Почтовый адрес',
					},
					{
						name: 'phone',
						type: 'varchar',
						length: '50',
						isNullable: true,
						comment: 'Основной телефон',
					},
					{
						name: 'additional_phones',
						type: 'varchar[]',
						default: "ARRAY[]::varchar[]",
						comment: 'Дополнительные телефоны',
					},
					{
						name: 'email',
						type: 'varchar',
						length: '255',
						isNullable: true,
						comment: 'Email',
					},
					{
						name: 'website',
						type: 'varchar',
						length: '255',
						isNullable: true,
						comment: 'Сайт компании',
					},
					{
						name: 'bank_name',
						type: 'varchar',
						length: '255',
						isNullable: true,
						comment: 'Название банка',
					},
					{
						name: 'bank_bik',
						type: 'varchar',
						length: '9',
						isNullable: true,
						comment: 'БИК банка',
					},
					{
						name: 'bank_account',
						type: 'varchar',
						length: '20',
						isNullable: true,
						comment: 'Расчётный счёт',
					},
					{
						name: 'bank_corr_account',
						type: 'varchar',
						length: '20',
						isNullable: true,
						comment: 'Корреспондентский счёт',
					},
					{
						name: 'company_type',
						type: 'company_type',
						default: "'customer'",
						comment: 'Тип компании',
					},
					{
						name: 'industry',
						type: 'varchar',
						length: '255',
						isNullable: true,
						comment: 'Отрасль',
					},
					{
						name: 'notes',
						type: 'text',
						isNullable: true,
						comment: 'Примечания',
					},
					{
						name: 'bitrix_company_id',
						type: 'varchar',
						length: '50',
						isNullable: true,
						isUnique: true,
						comment: 'ID компании в Bitrix24',
					},
					{
						name: 'sync_status',
						type: 'company_sync_status',
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
						comment: 'Дополнительные атрибуты',
					},
					{
						name: 'tags',
						type: 'varchar[]',
						default: "ARRAY[]::varchar[]",
						comment: 'Теги',
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

		// 4. Создаем таблицу контактов
		await queryRunner.createTable(
			new Table({
				name: 'contacts',
				columns: [
					{
						name: 'id',
						type: 'uuid',
						isPrimary: true,
						default: 'uuid_generate_v4()',
					},
					{
						name: 'first_name',
						type: 'varchar',
						length: '100',
						comment: 'Имя',
					},
					{
						name: 'last_name',
						type: 'varchar',
						length: '100',
						isNullable: true,
						comment: 'Фамилия',
					},
					{
						name: 'middle_name',
						type: 'varchar',
						length: '100',
						isNullable: true,
						comment: 'Отчество',
					},
					{
						name: 'phone',
						type: 'varchar',
						length: '50',
						isNullable: true,
						comment: 'Основной телефон',
					},
					{
						name: 'additional_phones',
						type: 'varchar[]',
						default: "ARRAY[]::varchar[]",
						comment: 'Дополнительные телефоны',
					},
					{
						name: 'email',
						type: 'varchar',
						length: '255',
						isNullable: true,
						comment: 'Email',
					},
					{
						name: 'position',
						type: 'varchar',
						length: '255',
						isNullable: true,
						comment: 'Должность',
					},
					{
						name: 'contact_type',
						type: 'contact_type',
						default: "'other'",
						comment: 'Тип контакта',
					},
					{
						name: 'department',
						type: 'varchar',
						length: '255',
						isNullable: true,
						comment: 'Отдел',
					},
					{
						name: 'company_id',
						type: 'uuid',
						isNullable: true,
						comment: 'ID компании',
					},
					{
						name: 'notes',
						type: 'text',
						isNullable: true,
						comment: 'Примечания',
					},
					{
						name: 'birthdate',
						type: 'date',
						isNullable: true,
						comment: 'Дата рождения',
					},
					{
						name: 'address',
						type: 'varchar',
						length: '500',
						isNullable: true,
						comment: 'Адрес',
					},
					{
						name: 'bitrix_contact_id',
						type: 'varchar',
						length: '50',
						isNullable: true,
						isUnique: true,
						comment: 'ID контакта в Bitrix24',
					},
					{
						name: 'sync_status',
						type: 'contact_sync_status',
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
						comment: 'Дополнительные атрибуты',
					},
					{
						name: 'tags',
						type: 'varchar[]',
						default: "ARRAY[]::varchar[]",
						comment: 'Теги',
					},
					{
						name: 'is_active',
						type: 'boolean',
						default: true,
					},
					{
						name: 'is_primary',
						type: 'boolean',
						default: false,
						comment: 'Основной контакт компании',
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

		// 5. Создаем индексы для companies
		await queryRunner.createIndex(
			'companies',
			new TableIndex({
				name: 'IDX_COMPANIES_INN',
				columnNames: ['inn'],
			})
		)

		await queryRunner.createIndex(
			'companies',
			new TableIndex({
				name: 'IDX_COMPANIES_ACTIVE',
				columnNames: ['is_active'],
			})
		)

		await queryRunner.createIndex(
			'companies',
			new TableIndex({
				name: 'IDX_COMPANIES_TYPE',
				columnNames: ['company_type'],
			})
		)

		await queryRunner.createIndex(
			'companies',
			new TableIndex({
				name: 'IDX_COMPANIES_SYNC_STATUS',
				columnNames: ['sync_status'],
			})
		)

		// Уникальный частичный индекс для bitrix_company_id
		await queryRunner.query(`
			CREATE UNIQUE INDEX "IDX_COMPANIES_BITRIX_ID"
			ON "companies" ("bitrix_company_id")
			WHERE "bitrix_company_id" IS NOT NULL;
		`)

		// GIN индекс для полнотекстового поиска
		await queryRunner.query(`
			CREATE INDEX "IDX_COMPANIES_SEARCH_VECTOR"
			ON "companies" USING GIN("search_vector");
		`)

		// GIN индекс для триграммного поиска по названию
		await queryRunner.query(`
			CREATE INDEX "IDX_COMPANIES_NAME_TRGM"
			ON "companies" USING GIN(name gin_trgm_ops);
		`)

		// 6. Создаем индексы для contacts
		await queryRunner.createIndex(
			'contacts',
			new TableIndex({
				name: 'IDX_CONTACTS_PHONE',
				columnNames: ['phone'],
			})
		)

		await queryRunner.createIndex(
			'contacts',
			new TableIndex({
				name: 'IDX_CONTACTS_EMAIL',
				columnNames: ['email'],
			})
		)

		await queryRunner.createIndex(
			'contacts',
			new TableIndex({
				name: 'IDX_CONTACTS_COMPANY',
				columnNames: ['company_id'],
			})
		)

		await queryRunner.createIndex(
			'contacts',
			new TableIndex({
				name: 'IDX_CONTACTS_ACTIVE',
				columnNames: ['is_active'],
			})
		)

		await queryRunner.createIndex(
			'contacts',
			new TableIndex({
				name: 'IDX_CONTACTS_TYPE',
				columnNames: ['contact_type'],
			})
		)

		await queryRunner.createIndex(
			'contacts',
			new TableIndex({
				name: 'IDX_CONTACTS_SYNC_STATUS',
				columnNames: ['sync_status'],
			})
		)

		await queryRunner.createIndex(
			'contacts',
			new TableIndex({
				name: 'IDX_CONTACTS_PRIMARY',
				columnNames: ['company_id', 'is_primary'],
			})
		)

		// Уникальный частичный индекс для bitrix_contact_id
		await queryRunner.query(`
			CREATE UNIQUE INDEX "IDX_CONTACTS_BITRIX_ID"
			ON "contacts" ("bitrix_contact_id")
			WHERE "bitrix_contact_id" IS NOT NULL;
		`)

		// GIN индекс для полнотекстового поиска
		await queryRunner.query(`
			CREATE INDEX "IDX_CONTACTS_SEARCH_VECTOR"
			ON "contacts" USING GIN("search_vector");
		`)

		// GIN индекс для триграммного поиска по ФИО
		await queryRunner.query(`
			CREATE INDEX "IDX_CONTACTS_NAME_TRGM"
			ON "contacts" USING GIN((first_name || ' ' || COALESCE(last_name, '')) gin_trgm_ops);
		`)

		// 7. Создаем триггер для автоматического обновления search_vector компаний
		await queryRunner.query(`
			CREATE OR REPLACE FUNCTION company_search_vector_update() RETURNS trigger AS $$
			BEGIN
				NEW.search_vector :=
					setweight(to_tsvector('russian', COALESCE(NEW.name, '')), 'A') ||
					setweight(to_tsvector('russian', COALESCE(NEW.short_name, '')), 'A') ||
					setweight(to_tsvector('simple', COALESCE(NEW.inn, '')), 'A') ||
					setweight(to_tsvector('simple', COALESCE(NEW.phone, '')), 'B') ||
					setweight(to_tsvector('simple', COALESCE(NEW.email, '')), 'B') ||
					setweight(to_tsvector('russian', COALESCE(NEW.notes, '')), 'C') ||
					setweight(to_tsvector('russian', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
				RETURN NEW;
			END;
			$$ LANGUAGE plpgsql;
		`)

		await queryRunner.query(`
			CREATE TRIGGER company_search_vector_trigger
			BEFORE INSERT OR UPDATE ON companies
			FOR EACH ROW EXECUTE FUNCTION company_search_vector_update();
		`)

		// 8. Создаем триггер для автоматического обновления search_vector контактов
		await queryRunner.query(`
			CREATE OR REPLACE FUNCTION contact_search_vector_update() RETURNS trigger AS $$
			BEGIN
				NEW.search_vector :=
					setweight(to_tsvector('russian', COALESCE(NEW.first_name, '')), 'A') ||
					setweight(to_tsvector('russian', COALESCE(NEW.last_name, '')), 'A') ||
					setweight(to_tsvector('russian', COALESCE(NEW.middle_name, '')), 'B') ||
					setweight(to_tsvector('simple', COALESCE(NEW.phone, '')), 'A') ||
					setweight(to_tsvector('simple', COALESCE(NEW.email, '')), 'B') ||
					setweight(to_tsvector('russian', COALESCE(NEW.position, '')), 'C') ||
					setweight(to_tsvector('russian', COALESCE(NEW.notes, '')), 'D') ||
					setweight(to_tsvector('russian', COALESCE(array_to_string(NEW.tags, ' '), '')), 'D');
				RETURN NEW;
			END;
			$$ LANGUAGE plpgsql;
		`)

		await queryRunner.query(`
			CREATE TRIGGER contact_search_vector_trigger
			BEFORE INSERT OR UPDATE ON contacts
			FOR EACH ROW EXECUTE FUNCTION contact_search_vector_update();
		`)

		// 9. Создаем внешние ключи
		await queryRunner.createForeignKey(
			'companies',
			new TableForeignKey({
				columnNames: ['created_by'],
				referencedTableName: 'users',
				referencedColumnNames: ['id'],
				onDelete: 'SET NULL',
				name: 'FK_COMPANIES_CREATOR',
			})
		)

		await queryRunner.createForeignKey(
			'companies',
			new TableForeignKey({
				columnNames: ['updated_by'],
				referencedTableName: 'users',
				referencedColumnNames: ['id'],
				onDelete: 'SET NULL',
				name: 'FK_COMPANIES_UPDATER',
			})
		)

		await queryRunner.createForeignKey(
			'contacts',
			new TableForeignKey({
				columnNames: ['company_id'],
				referencedTableName: 'companies',
				referencedColumnNames: ['id'],
				onDelete: 'SET NULL',
				name: 'FK_CONTACTS_COMPANY',
			})
		)

		await queryRunner.createForeignKey(
			'contacts',
			new TableForeignKey({
				columnNames: ['created_by'],
				referencedTableName: 'users',
				referencedColumnNames: ['id'],
				onDelete: 'SET NULL',
				name: 'FK_CONTACTS_CREATOR',
			})
		)

		await queryRunner.createForeignKey(
			'contacts',
			new TableForeignKey({
				columnNames: ['updated_by'],
				referencedTableName: 'users',
				referencedColumnNames: ['id'],
				onDelete: 'SET NULL',
				name: 'FK_CONTACTS_UPDATER',
			})
		)
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// Удаляем триггеры и функции
		await queryRunner.query(`DROP TRIGGER IF EXISTS contact_search_vector_trigger ON contacts;`)
		await queryRunner.query(`DROP FUNCTION IF EXISTS contact_search_vector_update();`)
		await queryRunner.query(`DROP TRIGGER IF EXISTS company_search_vector_trigger ON companies;`)
		await queryRunner.query(`DROP FUNCTION IF EXISTS company_search_vector_update();`)

		// Удаляем внешние ключи contacts
		await queryRunner.dropForeignKey('contacts', 'FK_CONTACTS_UPDATER')
		await queryRunner.dropForeignKey('contacts', 'FK_CONTACTS_CREATOR')
		await queryRunner.dropForeignKey('contacts', 'FK_CONTACTS_COMPANY')

		// Удаляем внешние ключи companies
		await queryRunner.dropForeignKey('companies', 'FK_COMPANIES_UPDATER')
		await queryRunner.dropForeignKey('companies', 'FK_COMPANIES_CREATOR')

		// Удаляем специальные индексы contacts
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_CONTACTS_NAME_TRGM";`)
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_CONTACTS_SEARCH_VECTOR";`)
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_CONTACTS_BITRIX_ID";`)

		// Удаляем обычные индексы contacts
		await queryRunner.dropIndex('contacts', 'IDX_CONTACTS_PRIMARY')
		await queryRunner.dropIndex('contacts', 'IDX_CONTACTS_SYNC_STATUS')
		await queryRunner.dropIndex('contacts', 'IDX_CONTACTS_TYPE')
		await queryRunner.dropIndex('contacts', 'IDX_CONTACTS_ACTIVE')
		await queryRunner.dropIndex('contacts', 'IDX_CONTACTS_COMPANY')
		await queryRunner.dropIndex('contacts', 'IDX_CONTACTS_EMAIL')
		await queryRunner.dropIndex('contacts', 'IDX_CONTACTS_PHONE')

		// Удаляем специальные индексы companies
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_COMPANIES_NAME_TRGM";`)
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_COMPANIES_SEARCH_VECTOR";`)
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_COMPANIES_BITRIX_ID";`)

		// Удаляем обычные индексы companies
		await queryRunner.dropIndex('companies', 'IDX_COMPANIES_SYNC_STATUS')
		await queryRunner.dropIndex('companies', 'IDX_COMPANIES_TYPE')
		await queryRunner.dropIndex('companies', 'IDX_COMPANIES_ACTIVE')
		await queryRunner.dropIndex('companies', 'IDX_COMPANIES_INN')

		// Удаляем таблицы
		await queryRunner.dropTable('contacts')
		await queryRunner.dropTable('companies')

		// Удаляем enum типы
		await queryRunner.query(`DROP TYPE IF EXISTS contact_sync_status;`)
		await queryRunner.query(`DROP TYPE IF EXISTS contact_type;`)
		await queryRunner.query(`DROP TYPE IF EXISTS company_sync_status;`)
		await queryRunner.query(`DROP TYPE IF EXISTS company_type;`)
	}
}
