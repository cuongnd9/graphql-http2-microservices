const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 50009,
  subscriptionPort: process.env.PORT || 60009,
  pgHost: process.env.PG_HOST || '127.0.0.1',
  pgPort: (process.env.PG_PORT as number | undefined) || 5432,
  pgDB: process.env.PG_DB || 'order_service',
  pgUser: process.env.PG_USER || 'postgres',
  pgPassword: process.env.PG_PASSWORD || 'postgres',
};

export default config;
