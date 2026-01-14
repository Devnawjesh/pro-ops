import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshTokenHashToUser1700000000000 implements MigrationInterface {
  name = 'AddRefreshTokenHashToUser1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE md_user
      ADD COLUMN IF NOT EXISTS refresh_token_hash TEXT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE md_user
      DROP COLUMN IF EXISTS refresh_token_hash;
    `);
  }
}
