import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePermissions1700000000000 implements MigrationInterface {
  name = 'CreatePermissions1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS md_permission (
        id BIGSERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        module TEXT NOT NULL,
        action TEXT NOT NULL,
        description TEXT NULL,
        status SMALLINT NOT NULL DEFAULT 1
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_md_permission_module ON md_permission(module);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_md_permission_action ON md_permission(action);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS md_role_permission (
        id BIGSERIAL PRIMARY KEY,
        role_id BIGINT NOT NULL REFERENCES md_role(id) ON DELETE CASCADE,
        permission_id BIGINT NOT NULL REFERENCES md_permission(id) ON DELETE CASCADE,
        UNIQUE(role_id, permission_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_md_role_permission_role ON md_role_permission(role_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_md_role_permission_permission ON md_role_permission(permission_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS md_role_permission;`);
    await queryRunner.query(`DROP TABLE IF EXISTS md_permission;`);
  }
}
