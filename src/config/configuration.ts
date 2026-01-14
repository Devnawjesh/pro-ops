export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  db: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
    ssl: (process.env.DB_SSL ?? 'false') === 'true',
  },
});
