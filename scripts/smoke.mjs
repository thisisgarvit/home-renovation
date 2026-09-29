// End-to-end smoke test in demo mode. Builds nothing: run `npm run build` first.
// Usage: npm run smoke            (checks flows)
//        SHOTS=1 npm run smoke    (also saves README screenshots to docs/screenshots)
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const PORT = 4179;
const URL = `http://localhost:${PORT}/`;
const SHOTS = process.env.SHOTS === '1';

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
for (let i = 0; ; i++) {
  try {
    if ((await fetch(URL)).ok) break;
  } catch {
    // not up yet
  }
  if (i > 60) { server.kill(); throw new Error('vite preview did not start'); }
  await new Promise((r) => setTimeout(r, 500));
}

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

if (SHOTS) mkdirSync('docs/screenshots', { recursive: true });
const shot = async (name) => { if (SHOTS) await page.screenshot({ path: `docs/screenshots/${name}.png` }); };
const step = (msg) => console.log(`✓ ${msg}`);
const click = (text) => page.getByRole('button', { name: text, exact: true }).first().click();
const see = async (text) => { await page.getByText(text, { exact: false }).first().waitFor({ timeout: 5000 }); };

try {
  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await see('Who is using the app?');
  await page.waitForTimeout(300);
  await shot('01-who');
  step('Who is using the app');

  await page.getByRole('button', { name: /Anil/ }).first().click();
  await see('Waiting on');
  await shot('02-tasks');
  step('Tasks home');

  await page.getByRole('button', { name: /^Mark done:/ }).first().click();
  await see('Marked done');
  await click('Undo');
  step('Tick task and undo');

  await click('Add expense');
  await see('How much did you pay?');
  await page.locator('#amt').fill('400');
  await shot('03-add-amount');
  await click('Next');
  await see('What was it for?');
  await click('Raw material');
  await shot('04-add-what');
  await click('Next');
  await see('Which material?');
  await click('Sanitaryware');
  await page.getByPlaceholder('e.g. floor drain, 4 inch').fill('Smaller floor drain');
  await click('Next');
  await see('Where was it used?');
  await click('Bathroom');
  await click('Next');
  await see('When did you pay?');
  await page.goBack();
  await see('Where was it used?');
  step('Phone back gesture goes back one step');
  await click('Next');
  await see('When did you pay?');
  await click('Next');
  await see('Check and save');
  await shot('05-add-review');
  await click('Save expense');
  await see('Expense saved');
  await shot('06-add-saved');
  await click('Done');
  await see('Waiting on');
  step('Add expense end to end');

  await click('Expenses');
  await see('Total after returns');
  await shot('07-expenses');
  await page.getByRole('button', { name: /Smaller floor drain/ }).first().click();
  await see('History');
  await shot('08-entry');
  await click('Delete expense');
  await see('Expense deleted');
  await click('Undo');
  step('Delete and undo');

  await click('Add expense');
  await see('How much did you pay?');
  await page.getByRole('button', { name: /Returned something to a shop/ }).click();
  await see('Which bill was the item on?');
  await page.locator('.row-btn').first().click();
  await see('How much did you get back?');
  await page.locator('#ramt').fill('100');
  await page.getByPlaceholder('e.g. Floor drain').fill('Extra bend');
  await click('Save return');
  await see('Return saved');
  await click('Done');
  await see('Total after returns');
  step('Return flow');

  await click('Summary');
  await see('Spending by room');
  await shot('09-summary');
  await page.getByRole('button', { name: /^Bathroom,/ }).first().click();
  await see('By category');
  await shot('10-room');
  step('Summary and room breakdown');

  await click('Workers');
  await see('days worked');
  await page.locator('.cal-day').nth(2).click();
  await shot('11-workers');
  step('Workers holiday toggle');

  if (errors.length) throw new Error(`Console errors:\n${errors.join('\n')}`);
  console.log('\nAll smoke checks passed.');
} catch (e) {
  await page.screenshot({ path: 'test-results-failure.png' }).catch(() => {});
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.kill();
}
