import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersRbacBase1699999999999 implements MigrationInterface {
  name = 'CreateUsersRbacBase1699999999999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) md_role
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS md_role (
        id BIGSERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        status SMALLINT NOT NULL DEFAULT 1
      );
    `);

    // 2) md_user (minimal auth-ready)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS md_user (
        id BIGSERIAL PRIMARY KEY,
        company_id BIGINT NOT NULL,
        user_code TEXT NOT NULL,
        full_name TEXT NOT NULL,
        mobile TEXT NOT NULL,
        email TEXT NULL,
        username TEXT NOT NULL,
        password_hash TEXT NULL,
        refresh_token_hash TEXT NULL,
        user_type SMALLINT NOT NULL,
        reporting_manager_id BIGINT NULL REFERENCES md_user(id),
        status SMALLINT NOT NULL DEFAULT 1,
        last_login_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_md_user_company_username
      ON md_user(company_id, username);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_md_user_company_user_code
      ON md_user(company_id, user_code);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_md_user_company_mobile
      ON md_user(company_id, mobile);
    `);

    // 3) md_user_role
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS md_user_role (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES md_user(id) ON DELETE CASCADE,
        role_id BIGINT NOT NULL REFERENCES md_role(id) ON DELETE CASCADE,
        UNIQUE(user_id, role_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_md_user_role_user ON md_user_role(user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_md_user_role_role ON md_user_role(role_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS md_user_role;`);
    await queryRunner.query(`DROP TABLE IF EXISTS md_user;`);
    await queryRunner.query(`DROP TABLE IF EXISTS md_role;`);
  }
}