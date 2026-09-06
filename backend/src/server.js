const app = require('./app');
const env = require('./config/env');
const { pool } = require('./config/db');

const startServer = async () => {
  try {
    await pool.query('SELECT 1'); // Test DB connection
    console.log('Database connection established.');

    app.listen(env.port, () => {
      console.log(`Server listening on port ${env.port} in ${env.nodeEnv} mode.`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();
