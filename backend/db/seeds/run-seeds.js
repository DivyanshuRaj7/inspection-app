const bcrypt = require('bcrypt');
const { pool } = require('../../src/config/db');

async function runSeeds() {
  const client = await pool.connect();
  try {
    console.log('Starting to seed the database...');
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash('password123', 12);

    // 1. Seed Users
    const users = [
      { id: '11111111-1111-1111-1111-111111111111', full_name: 'Admin User', email: 'admin@compliance.local', role: 'ADMIN' },
      { id: '22222222-2222-2222-2222-222222222222', full_name: 'Official User', email: 'official@compliance.local', role: 'OFFICIAL' },
      { id: '33333333-3333-3333-3333-333333333333', full_name: 'Inspector User', email: 'inspector@compliance.local', role: 'INSPECTOR' }
    ];

    for (const u of users) {
      await client.query(`
        INSERT INTO users (id, full_name, email, password_hash, role)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO NOTHING
      `, [u.id, u.full_name, u.email, passwordHash, u.role]);
    }

    // 2. Seed Rule Config
    const ruleConfigId = '44444444-4444-4444-4444-444444444444';
    const ruleConfigVersion = 'LMR-2011-v1';
    
    // Deactivate existing rules if any, though on fresh seed it shouldn't matter
    await client.query(`UPDATE rule_configs SET status = 'RETIRED' WHERE status = 'ACTIVE'`);
    
    await client.query(`
      INSERT INTO rule_configs (id, version, rules, effective_from, status, created_by)
      VALUES ($1, $2, $3, NOW(), 'ACTIVE', $4)
      ON CONFLICT (version) DO NOTHING
    `, [ruleConfigId, ruleConfigVersion, JSON.stringify({ schemaVersion: "1.0", rules: [] }), users[0].id]);

    // 3. Seed Inspections
    const inspections = [
      { id: '55555555-5555-5555-5555-555555555551', client_id: 'c1111111-1111-1111-1111-111111111111', status: 'DRAFT' },
      { id: '55555555-5555-5555-5555-555555555552', client_id: 'c2222222-2222-2222-2222-222222222222', status: 'PENDING_REVIEW' },
      { id: '55555555-5555-5555-5555-555555555553', client_id: 'c3333333-3333-3333-3333-333333333333', status: 'COMPLETED' },
      { id: '55555555-5555-5555-5555-555555555554', client_id: 'c4444444-4444-4444-4444-444444444444', status: 'COMPLETED' }
    ];

    for (const ins of inspections) {
      await client.query(`
        INSERT INTO inspections (id, client_inspection_id, inspector_id, status, product_name, rule_config_version, client_updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (client_inspection_id) DO NOTHING
      `, [ins.id, ins.client_id, users[2].id, ins.status, 'Seed Product', ruleConfigVersion]);
    }

    await client.query('COMMIT');
    console.log('Database seeded successfully.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Seeding failed:', e);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

runSeeds();
