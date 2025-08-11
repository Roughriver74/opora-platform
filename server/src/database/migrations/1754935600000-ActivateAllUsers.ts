import { MigrationInterface, QueryRunner } from "typeorm"

export class ActivateAllUsers1754935600000 implements MigrationInterface {
    name = 'ActivateAllUsers1754935600000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Активируем всех неактивных пользователей
        await queryRunner.query(`
            UPDATE users 
            SET is_active = true, status = 'active' 
            WHERE is_active = false OR status = 'inactive'
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // В случае отката миграции не делаем ничего, 
        // так как мы не знаем исходное состояние пользователей
    }
}