const request = require('supertest');
const crypto = require('crypto');
const app = require('../../src/app');
const { pool } = require('../../src/config/db');

var inspectorToken;
var ruleConfigVersion = 'LMR-2011-v1';

beforeAll(async () => {
  var res = await request(app).post('/api/v1/auth/login').send({ email: 'inspector@compliance.local', password: 'password123' });
  inspectorToken = res.body.data.token;
});

afterAll(async () => {
  await pool.end();
});

describe('Sync API Integration', () => {
  var clientInspectionId = crypto.randomUUID();
  var idempotencyKey = crypto.randomUUID();
  var fixedTimestamp = '2026-01-01T00:00:00.000Z';

  // Build the payload once so the hash is identical on replay
  var syncPayload = {
    idempotencyKey: idempotencyKey,
    items: [{
      clientInspectionId: clientInspectionId,
      baseServerVersion: 1,
      operation: 'CREATE',
      clientUpdatedAt: fixedTimestamp,
      ruleConfigVersion: ruleConfigVersion,
      payload: { productName: 'Sync Test Product' }
    }]
  };

  it('Sync create succeeds', async () => {
    var res = await request(app)
      .post('/api/v1/sync/inspections')
      .set('Authorization', 'Bearer ' + inspectorToken)
      .send(syncPayload);

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.results[0].status).toEqual('SYNCED');
    expect(res.body.data.results[0].serverId).toBeDefined();
  });

  it('Replayed sync request returns original result (idempotency)', async () => {
    var res = await request(app)
      .post('/api/v1/sync/inspections')
      .set('Authorization', 'Bearer ' + inspectorToken)
      .send(syncPayload);

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.results[0].status).toEqual('SYNCED');
  });

  it('Same idempotency key with different request payload returns 409', async () => {
    var differentPayload = {
      idempotencyKey: idempotencyKey,
      items: [{
        clientInspectionId: crypto.randomUUID(),
        baseServerVersion: 1,
        operation: 'CREATE',
        clientUpdatedAt: fixedTimestamp,
        ruleConfigVersion: ruleConfigVersion,
        payload: { productName: 'Different Product' }
      }]
    };

    var res = await request(app)
      .post('/api/v1/sync/inspections')
      .set('Authorization', 'Bearer ' + inspectorToken)
      .send(differentPayload);

    expect(res.statusCode).toEqual(409);
  });

  it('Sync conflict does not overwrite server data', async () => {
    // First update the inspection to bump server_version to 2
    var updateKey = crypto.randomUUID();
    await request(app)
      .post('/api/v1/sync/inspections')
      .set('Authorization', 'Bearer ' + inspectorToken)
      .send({
        idempotencyKey: updateKey,
        items: [{
          clientInspectionId: clientInspectionId,
          baseServerVersion: 1,
          operation: 'UPDATE',
          clientUpdatedAt: fixedTimestamp,
          ruleConfigVersion: ruleConfigVersion,
          payload: { productName: 'Updated Product' }
        }]
      });

    // Now send a stale update with baseServerVersion: 1 (should be 2)
    var staleKey = crypto.randomUUID();
    var res = await request(app)
      .post('/api/v1/sync/inspections')
      .set('Authorization', 'Bearer ' + inspectorToken)
      .send({
        idempotencyKey: staleKey,
        items: [{
          clientInspectionId: clientInspectionId,
          baseServerVersion: 1,
          operation: 'UPDATE',
          clientUpdatedAt: fixedTimestamp,
          ruleConfigVersion: ruleConfigVersion,
          payload: { productName: 'Should Not Overwrite' }
        }]
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.results[0].status).toEqual('CONFLICT');
    expect(res.body.data.results[0].serverVersion).toBeGreaterThan(1);
  });
});
