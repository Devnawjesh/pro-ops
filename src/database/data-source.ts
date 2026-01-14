import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';

const isSSL = process.env.DB_SSL === 'true';

const options: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,

  // IMPORTANT: CLI needs these. autoLoadEntities does NOT work here.
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/database/migrations/*.js'],

  synchronize: false,
  ssl: isSSL ? { rejectUnauthorized: false } : false,
  logging: false,
};

export default new DataSource(options);
