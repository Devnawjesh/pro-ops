import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function buildTypeOrmOptions(db: {
  host: string;
  port: number;
  username: string;
  password: string;
  name: string;
  ssl: boolean;
}): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: db.host,
    port: db.port,
    username: db.username,
    password: db.password,
    database: db.name,
    autoLoadEntities: true,
    synchronize: false,
    ssl: db.ssl ? { rejectUnauthorized: false } : false,
    migrations: ['dist/database/migrations/*.js'],
    migrationsRun: false,
    logging: ['error'],
  };
}
