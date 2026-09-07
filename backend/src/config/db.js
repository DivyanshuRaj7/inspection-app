const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  connectionString: env.db.url,
  ssl: env.db.ssl ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool,
};
