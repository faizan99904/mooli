#!/usr/bin/env node
/**
 * Ward module smoke test — routes, API auth, and optional live data checks.
 * Usage:
 *   node scripts/ward-smoke-test.mjs
 *   WARD_TEST_EMAIL=you@hospital.com WARD_TEST_PASSWORD=secret node scripts/ward-smoke-test.mjs
 */

const API_BASE = process.env.API_BASE_URL || 'https://hmsbackend-faizan99904.fly.dev/api/v1';
const WEB_BASE = process.env.WEB_BASE_URL || 'http://localhost:4200';

const WARD_ROUTES = [
  'ward/dashboard',
  'ward/bed-management',
  'ward/patient-list',
  'ward/admissions',
  'ward/vitals',
  'ward/mar',
  'ward/drips-iv',
  'ward/nursing-care',
  'ward/shift-handover',
  'ward/reports',
  'room-allotment/add-alloted-rooms',
];

const WARD_API_ENDPOINTS = [
  'rooms?limit=5',
  'room-allotments?limit=5',
  'hospital-wards?limit=5',
  'prescriptions?limit=5',
  'patient-history?recordType=ward&limit=5',
  'encounters?type=admission&limit=5',
  'laboratory/orders?limit=5',
  'ward/beds?limit=5',
  'ward/activities?limit=5',
  'ward/reports',
];

async function fetchStatus(url, options = {}) {
  const response = await fetch(url, options);
  return { status: response.status, ok: response.ok, response };
}

async function testWebRoutes() {
  const results = [];
  for (const route of WARD_ROUTES) {
    const url = `${WEB_BASE}/${route}`;
    try {
      const { status } = await fetchStatus(url);
      results.push({ route, status, pass: status === 200 });
    } catch (error) {
      results.push({ route, status: 0, pass: false, error: error.message });
    }
  }
  return results;
}

async function login() {
  const email = process.env.WARD_TEST_EMAIL;
  const password = process.env.WARD_TEST_PASSWORD;
  if (!email || !password) {
    return null;
  }

  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json();
  if (!body.success) {
    throw new Error(body.message || 'Login failed');
  }
  return body.data?.token || null;
}

async function testApiEndpoints(token) {
  const results = [];
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  for (const endpoint of WARD_API_ENDPOINTS) {
    const url = `${API_BASE}/${endpoint}`;
    try {
      const response = await fetch(url, { headers });
      const body = await response.json().catch(() => ({}));
      const itemCount = Array.isArray(body.data?.items)
        ? body.data.items.length
        : body.data && typeof body.data === 'object'
          ? Object.keys(body.data).length
          : 0;
      results.push({
        endpoint,
        status: response.status,
        pass: token ? response.ok : response.status === 401,
        itemCount: token && response.ok ? itemCount : undefined,
        message: body.message,
      });
    } catch (error) {
      results.push({ endpoint, status: 0, pass: false, error: error.message });
    }
  }
  return results;
}

function printSection(title, rows) {
  console.log(`\n=== ${title} ===`);
  for (const row of rows) {
    const icon = row.pass ? 'PASS' : 'FAIL';
    const extra = [
      row.status ? `HTTP ${row.status}` : '',
      row.itemCount != null ? `items=${row.itemCount}` : '',
      row.error || row.message || '',
    ]
      .filter(Boolean)
      .join(' | ');
    console.log(`${icon} ${row.route || row.endpoint}${extra ? ` — ${extra}` : ''}`);
  }
}

async function main() {
  console.log('Ward smoke test');
  console.log(`Web: ${WEB_BASE}`);
  console.log(`API: ${API_BASE}`);

  const webResults = await testWebRoutes();
  printSection('Frontend routes (SPA shell)', webResults);

  let token = null;
  try {
    token = await login();
    if (token) {
      console.log('\nAuthenticated API tests enabled via WARD_TEST_EMAIL.');
    } else {
      console.log('\nNo WARD_TEST_EMAIL / WARD_TEST_PASSWORD — API auth-only checks only.');
    }
  } catch (error) {
    console.log(`\nLogin failed: ${error.message}`);
  }

  const apiResults = await testApiEndpoints(token);
  printSection(token ? 'Backend ward data APIs' : 'Backend APIs (expect 401 without token)', apiResults);

  const failed = [...webResults, ...apiResults].filter((row) => !row.pass).length;
  console.log(`\nSummary: ${webResults.length + apiResults.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
