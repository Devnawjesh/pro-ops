import 'dotenv/config';
import { DataSource } from 'typeorm';

const isSSL = process.env.DB_SSL === 'true';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,

  // TS mode paths
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],

  synchronize: false,
  ssl: isSSL ? { rejectUnauthorized: false } : false,
  logging: false,
});