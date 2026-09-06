const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/config/db');

let inspectorToken;
let officialToken;
let inspector2Token;
let adminToken;
let testInspectionId;
var testRuleConfigVersion = 'LMR-2011-v1';

beforeAll(async () => {
  var res1 = await request(app).post('/api/v1/auth/login').send({ email: 'inspector@compliance.local', password: 'password123' });
  inspectorToken = res1.body.data.token;

  var res2 = await request(app).post('/api/v1/auth/login').send({ email: 'official@compliance.local', password: 'password123' });
  officialToken = res2.body.data.token;

  var res3 = await request(app).post('/api/v1/auth/login').send({ email: 'inspector2@compliance.local', password: 'password123' });
  inspector2Token = res3.body.data.token;

  var res4 = await request(app).post('/api/v1/auth/login').send({ email: 'admin@compliance.local', password: 'password123' });
  adminToken = res4.body.data.token;

  var id = require('crypto').randomUUID();
  await pool.query(
    'INSERT INTO inspections (id, client_inspection_id, inspector_id, rule_config_version, status, server_version, mrp, client_updated_at) VALUES ($1, $1, $2, $3, $4, $5, $6, $7)',
    [id, '33333333-3333-3333-3333-333333333333', testRuleConfigVersion, 'DRAFT', 1, 100, '2026-01-01T00:00:00Z']
  );
  testInspectionId = id;
});

afterAll(async () => {
  await pool.end();
});

describe('Inspection API Integration', () => {
  it('Inspector cannot view another inspectors inspection', async () => {
    var res = await request(app)
      .get('/api/v1/inspections/' + testInspectionId)
      .set('Authorization', 'Bearer ' + inspector2Token);
    expect(res.statusCode).toEqual(403);
  });

  it('Official can view all inspections', async () => {
    var res = await request(app)
      .get('/api/v1/inspections/' + testInspectionId)
      .set('Authorization', 'Bearer ' + officialToken);
    expect(res.statusCode).toEqual(200);
  });

  it('Inspector cannot access admin rule-management endpoint', async () => {
    var res = await request(app)
      .post('/api/v1/rules')
      .set('Authorization', 'Bearer ' + inspectorToken)
      .send({ version: 'v2', rules: {} });
    expect(res.statusCode).toEqual(403);
  });

  it('Update succeeds with current server_version', async () => {
    var res = await request(app)
      .patch('/api/v1/inspections/' + testInspectionId)
      .set('Authorization', 'Bearer ' + inspectorToken)
      .send({ server_version: 1, mrp: 200 });

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.server_version).toEqual(2);
  });

  it('Stale update returns 409', async () => {
    var res = await request(app)
      .patch('/api/v1/inspections/' + testInspectionId)
      .set('Authorization', 'Bearer ' + inspectorToken)
      .send({ server_version: 1, mrp: 300 });

    expect(res.statusCode).toEqual(409);
  });

  it('Inspection submit succeeds', async () => {
    var res = await request(app)
      .post('/api/v1/inspections/' + testInspectionId + '/submit')
      .set('Authorization', 'Bearer ' + inspectorToken)
      .send({ server_version: 2 });

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.status).toEqual('PENDING_REVIEW');
    expect(res.body.data.server_version).toEqual(3);
  });

  it('Attach compliance result succeeds when valid', async () => {
    var res = await request(app)
      .post('/api/v1/inspections/' + testInspectionId + '/compliance-result')
      .set('Authorization', 'Bearer ' + adminToken)
      .send({
        ruleConfigVersion: testRuleConfigVersion,
        status: 'EVALUATED',
        result: {
          verdict: 'COMPLIANT'
        }
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.compliance_result.verdict).toEqual('COMPLIANT');
  });
});
