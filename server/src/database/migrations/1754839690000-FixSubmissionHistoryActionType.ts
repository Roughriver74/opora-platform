import { MigrationInterface, QueryRunner } from 'typeorm'

export class FixSubmissionHistoryActionType1754839690000 implements MigrationInterface {
    name = 'FixSubmissionHistoryActionType1754839690000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // This migration is a no-op for production environments
        // where the schema is already in the correct state
        console.log('Migration FixSubmissionHistoryActionType1754839690000: Skipping - production environment')
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // No rollback needed for no-op migration
        console.log('Rollback FixSubmissionHistoryActionType1754839690000: No action needed')
    }
}