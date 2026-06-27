#!/usr/bin/env node
/**
 * Shift Handover API integration test
 * Usage:
 *   node scripts/handover-api-test.mjs
 *   API_BASE_URL=http://localhost:3001/api/v1 WARD_TEST_EMAIL=ward@example.com WARD_TEST_PASSWORD=password123 node scripts/handover-api-test.mjs
 */

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3001/api/v1';
const EMAIL = process.env.WARD_TEST_EMAIL || 'ward@example.com';
const PASSWORD = process.env.WARD_TEST_PASSWORD || 'password123';

const results = [];

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  const icon = pass ? 'PASS' : 'FAIL';
  console.log(`${icon} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  const body = await response.json().catch(() => ({}));
  return { response, body, status: response.status, ok: response.ok };
}

async function login() {
  const { body, ok, status } = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!ok || !body.success) {
    throw new Error(`Login failed (${status}): ${body.message || 'unknown error'}`);
  }
  return body.data.token;
}

async function main() {
  console.log('Shift Handover API Test');
  console.log(`API: ${API_BASE}`);
  console.log(`User: ${EMAIL}\n`);

  let token;
  try {
    token = await login();
    record('Auth login', true, 'token received');
  } catch (error) {
    record('Auth login', false, error.message);
    process.exit(1);
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // 1. Unauthenticated should 401
  {
    const { status } = await request('/ward/activities?activityType=handover&limit=5');
    record('GET activities without token → 401', status === 401, `HTTP ${status}`);
  }

  // 2. List all handovers
  let handovers = [];
  {
    const { ok, status, body } = await request('/ward/activities?activityType=handover&limit=50', { headers });
    handovers = body.data?.items || [];
    record('GET /ward/activities?activityType=handover', ok, `HTTP ${status}, count=${handovers.length}`);
  }

  // 3. List by shift filter
  for (const shift of ['day', 'evening', 'night']) {
    const { ok, status, body } = await request(`/ward/activities?activityType=handover&shift=${shift}&limit=20`, { headers });
    const count = body.data?.items?.length ?? 0;
    record(`GET handovers shift=${shift}`, ok, `HTTP ${status}, count=${count}`);
  }

  // 4. Get patient for create test
  let patientId = null;
  let admissionId = null;
  {
    const { ok, body } = await request('/room-allotments?status=admitted&limit=5', { headers });
    const allotments = body.data?.items || [];
    if (ok && allotments.length) {
      patientId = allotments[0].patientId?._id || allotments[0].patientId;
      admissionId = allotments[0]._id;
      record('Fetch admitted patient context', true, `patientId=${patientId}`);
    } else {
      const patientsRes = await request('/patients?limit=1', { headers });
      const patients = patientsRes.body.data?.items || [];
      patientId = patients[0]?._id || null;
      record('Fetch patient context', !!patientId, patientId ? `patientId=${patientId}` : 'no patients found');
    }
  }

  if (!patientId) {
    record('CREATE handover', false, 'skipped — no patient available');
    printSummary();
    process.exit(1);
  }

  // 5. Create handover (matches frontend submitModuleAction payload)
  let createdId = null;
  const createPayload = {
    activityType: 'handover',
    status: 'completed',
    patientId,
    admissionId: admissionId || undefined,
    title: 'Handover - day',
    description: 'API test handover notes',
    shift: 'day',
    metadata: {
      nurseName: 'Test Nurse',
      pending: '2',
      patientCondition: 'Stable, conscious, on IV fluids',
      pendingMedicines: 'Paracetamol 500mg at 18:00',
      pendingLabs: 'CBC report pending',
      runningDrips: 'NS 500ml',
      specialInstructions: 'Monitor vitals every 4 hours',
      riskAlerts: 'Fall risk',
      doctorInformed: 'yes',
    },
  };

  {
    const { ok, status, body } = await request('/ward/activities', {
      method: 'POST',
      headers,
      body: JSON.stringify(createPayload),
    });
    createdId = body.data?._id;
    const meta = body.data?.metadata || {};
    const checks = [
      ok,
      body.data?.activityType === 'handover',
      body.data?.status === 'completed',
      meta.nurseName === 'Test Nurse',
      meta.patientCondition?.includes('Stable'),
    ];
    record(
      'POST /ward/activities (create handover)',
      checks.every(Boolean),
      `HTTP ${status}, id=${createdId || 'none'}`
    );
  }

  // 6. Invalid create — missing activityType
  {
    const { status, body } = await request('/ward/activities', {
      method: 'POST',
      headers,
      body: JSON.stringify({ status: 'completed', patientId }),
    });
    record('POST invalid payload → 400', status === 400, `HTTP ${status}, msg=${body.message || ''}`);
  }

  // 7. Invalid patient
  {
    const { status } = await request('/ward/activities', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        activityType: 'handover',
        patientId: '000000000000000000000000',
        status: 'completed',
      }),
    });
    record('POST invalid patientId → 400', status === 400, `HTTP ${status}`);
  }

  if (!createdId) {
    printSummary();
    process.exit(1);
  }

  // 8. Verify created handover appears in list
  {
    const { ok, body } = await request('/ward/activities?activityType=handover&limit=50', { headers });
    const found = (body.data?.items || []).some((item) => item._id === createdId);
    record('GET list contains new handover', ok && found, found ? `id=${createdId}` : 'not found');
  }

  // 9. Update handover
  {
    const { ok, status, body } = await request(`/ward/activities/${createdId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        description: 'Updated handover notes via API test',
        metadata: {
          ...createPayload.metadata,
          pending: '1',
          riskAlerts: 'None',
        },
      }),
    });
    const updated = body.data?.metadata?.pending === '1';
    record('PATCH /ward/activities/:id', ok && updated, `HTTP ${status}`);
  }

  // 10. Filter by patientId
  {
    const { ok, body } = await request(`/ward/activities?activityType=handover&patientId=${patientId}&limit=20`, { headers });
    const found = (body.data?.items || []).some((item) => item._id === createdId);
    record('GET handovers by patientId', ok && found, `count=${body.data?.items?.length ?? 0}`);
  }

  // 11. Ward reports (dashboard uses activities count)
  {
    const { ok, status } = await request('/ward/reports', { headers });
    record('GET /ward/reports', ok, `HTTP ${status}`);
  }

  // 12. Related bundle endpoints used by shift-handover page
  for (const endpoint of [
    'room-allotments?limit=5',
    'prescriptions?limit=5',
    'patient-history?recordType=ward&limit=5',
    'laboratory/orders?limit=5',
  ]) {
    const { ok, status, body } = await request(`/${endpoint}`, { headers });
    const count = body.data?.items?.length ?? 0;
    record(`GET /${endpoint.split('?')[0]}`, ok, `HTTP ${status}, items=${count}`);
  }

  printSummary();
  process.exit(results.some((r) => !r.pass) ? 1 : 0);
}

function printSummary() {
  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;
  console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
