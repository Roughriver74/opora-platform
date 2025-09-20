import { MigrationInterface, QueryRunner, Table } from 'typeorm'

export class CreateSyncMetadataTable1737288000000
	implements MigrationInterface
{
	name = 'CreateSyncMetadataTable1737288000000'

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.createTable(
			new Table({
				name: 'sync_metadata',
				columns: [
					{
						name: 'id',
						type: 'uuid',
						isPrimary: true,
						generationStrategy: 'uuid',
						default: 'uuid_generate_v4()',
					},
					{
						name: 'entityType',
						type: 'varchar',
						length: '50',
						isUnique: true,
					},
					{
						name: 'lastSyncTime',
						type: 'timestamp',
						isNullable: true,
					},
					{
						name: 'status',
						type: 'varchar',
						length: '20',
						default: "'idle'",
					},
					{
						name: 'totalProcessed',
						type: 'int',
						default: 0,
					},
					{
						name: 'successful',
						type: 'int',
						default: 0,
					},
					{
						name: 'failed',
						type: 'int',
						default: 0,
					},
					{
						name: 'errors',
						type: 'text',
						isArray: true,
						default: "'{}'",
					},
					{
						name: 'createdAt',
						type: 'timestamp',
						default: 'CURRENT_TIMESTAMP',
					},
					{
						name: 'updatedAt',
						type: 'timestamp',
						default: 'CURRENT_TIMESTAMP',
					},
				],
			}),
			true
		)
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropTable('sync_metadata')
	}
}

