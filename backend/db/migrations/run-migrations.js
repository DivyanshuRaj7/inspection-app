const fs = require('fs');
const path = require('path');
const { pool } = require('../../src/config/db');

async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Create migrations table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      const { rows } = await client.query('SELECT name FROM migrations WHERE name = $1', [file]);
      if (rows.length === 0) {
        console.log(`Running migration: ${file}`);
        const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
        await client.query(sql);
        await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
        console.log(`Migration ${file} completed.`);
      }
    }

    await client.query('COMMIT');
    console.log('All migrations executed successfully.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', e);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

runMigrations();
