// Live-mode check without a real database: builds against a fake Supabase URL and
// answers its REST calls in the browser, verifying the family code gate and that
// saves reach the database with the code header and snake_case columns.
// Usage: npm run smoke:live
import { execSync, spawn } from 'node:child_process';
import { chromium } from 'playwright';

const SB = 'https://fake-project.supabase.co';
const OUT = 'dist-live-check';
const PORT = 4180;
execSync(`npx vite build --outDir ${OUT} --emptyOutDir`, {
  stdio: 'ignore',
  env: { ...process.env, VITE_SUPABASE_URL: SB, VITE_SUPABASE_ANON_KEY: 'anon-test-key', VITE_FAMILY: 'Garvit,Manmohan,Rekha', VITE_DEMO: '' }
});
const server = spawn('npx', ['vite', 'preview', '--outDir', OUT, '--port', String(PORT), '--strictPort'], { stdio: 'ignore', detached: true });
for (let i = 0; ; i++) {
  try { if ((await fetch(`http://localhost:${PORT}/`)).ok) break; } catch { /* starting */ }
  if (i > 60) throw new Error('preview did not start');
  await new Promise((r) => setTimeout(r, 500));
}

const db = { expenses: [], crews: [], tasks: [], photos: [], settings: [] };
const seen = { keys: new Set(), upserts: [] };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.route(`${SB}/**`, async (route) => {
  const req = route.request();
  const url = new URL(req.url());
  const key = req.headers()['x-family-key'] ?? '';
  seen.keys.add(key);
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  if (url.pathname === '/rest/v1/rpc/check_family_code') {
    return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(key === 'fam-123') });
  }
  const table = url.pathname.replace('/rest/v1/', '');
  if (req.method() === 'GET') {
    const rows = key === 'fam-123' ? db[table] ?? [] : [];
    return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(rows) });
  }
  if (req.method() === 'POST') {
    const rows = JSON.parse(req.postData() || '[]');
    seen.upserts.push({ table, rows, key });
    for (const r of rows) {
      const list = db[table];
      const i = list.findIndex((x) => x.id === r.id);
      const row = { created_at: new Date().toISOString(), ...r };
      if (i >= 0) list[i] = { ...list[i], ...row }; else list.push(row);
    }
    return route.fulfill({ status: 201, headers: cors, body: '' });
  }
  return route.fulfill({ status: 204, headers: cors, body: '' });
});

const check = (cond, msg) => { if (!cond) throw new Error(`FAILED: ${msg}`); console.log(`✓ ${msg}`); };

try {
  await page.goto(`http://localhost:${PORT}/`);
  await page.getByText('Family code').waitFor();
  check(true, 'asks for the family code first');
  await page.getByRole('textbox').fill('wrong');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByText("That code didn't work").waitFor();
  check(true, 'rejects a wrong code');
  await page.getByRole('textbox').fill('fam-123');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: /Rekha/ }).click();
  await page.getByText('Nothing to do right now').waitFor();
  check(true, 'right code opens an empty family app with real names');

  await page.getByRole('button', { name: 'Add expense' }).click();
  await page.locator('#amt').fill('2500');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Plumber', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Kitchen', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Save expense' }).click();
  await page.getByText('Expense saved').waitFor();
  await page.getByText('Garvit and Manmohan can see it now.').waitFor();
  await page.waitForTimeout(500);

  const up = seen.upserts.find((u) => u.table === 'expenses');
  check(!!up, 'expense was sent to Supabase');
  check(up.key === 'fam-123', 'request carried the family code header');
  const row = up.rows[0];
  check(row.added_by === 'Rekha' && row.paid_by === 'Rekha' && row.amount === 2500 && row.room === 'Kitchen' && row.cat === 'plumber', 'row uses database column names and values');
  check(Array.isArray(row.history) && row.history[0].what === 'Added', 'history recorded');

  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'Expenses', exact: true }).click();
  await page.getByText('Total after returns: ₹2,500').waitFor();
  check(true, 'saved expense reloads from the database');
  check(![...seen.keys].some((k) => k && k !== 'fam-123' && k !== 'wrong'), 'no unexpected codes sent');
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('\nLive-mode checks passed.');
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser.close();
  try { process.kill(-server.pid); } catch { /* already stopped */ }
  execSync(`rm -rf ${OUT}`);
}
process.exit(process.exitCode ?? 0);
