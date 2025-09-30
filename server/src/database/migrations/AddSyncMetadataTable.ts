import { MigrationInterface, QueryRunner, Table } from 'typeorm'

export class AddSyncMetadataTable1756000000000 implements MigrationInterface {
	name = 'AddSyncMetadataTable1756000000000'

	public async up(queryRunner: QueryRunner): Promise<void> {
		// Создаем enum для статуса синхронизации (если не существует)
		await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."sync_metadata_status_enum" AS ENUM('idle', 'running', 'completed', 'failed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `)

		// Создаем таблицу sync_metadata
		await queryRunner.createTable(
			new Table({
				name: 'sync_metadata',
				columns: [
					{
						name: 'entity_type',
						type: 'character varying',
						length: '50',
						isPrimary: true,
					},
					{
						name: 'last_sync_time',
						type: 'timestamp',
						isNullable: true,
					},
					{
						name: 'last_full_sync_time',
						type: 'timestamp',
						isNullable: true,
					},
					{
						name: 'total_processed',
						type: 'integer',
						default: 0,
					},
					{
						name: 'successful',
						type: 'integer',
						default: 0,
					},
					{
						name: 'failed',
						type: 'integer',
						default: 0,
					},
					{
						name: 'errors',
						type: 'text',
						isArray: true,
						default: "'{}'",
					},
					{
						name: 'status',
						type: 'enum',
						enum: ['idle', 'running', 'completed', 'failed'],
						default: "'idle'",
					},
					{
						name: 'created_at',
						type: 'timestamp',
						default: 'now()',
					},
					{
						name: 'updated_at',
						type: 'timestamp',
						default: 'now()',
					},
				],
			}),
			true
		)
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropTable('sync_metadata')
		await queryRunner.query(`
      DO $$ BEGIN
        DROP TYPE "public"."sync_metadata_status_enum";
      EXCEPTION
        WHEN undefined_object THEN null;
      END $$;
    `)
	}
}
