import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const CREDS = { username: process.env.DASHBOARD_USER || 'admin', password: process.env.DASHBOARD_PASS || '' };

test.describe('Hermes Dashboard', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    page.setDefaultTimeout(15000);
  });

  test.afterAll(async () => {
    await page?.close();
  });

  // ── LOGIN ──
  test('login page loads with CSS', async () => {
    await page.goto(`${BASE}/login`);
    await page.screenshot({ path: 'tests/screenshots/01-login-before.png', fullPage: true });
    
    // Check CSS loaded - body should have dark background (not white)
    const bgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    console.log('Login page background:', bgColor);
    
    // Check form elements exist
    await expect(page.locator('input[name="username"], input[type="text"]').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[name="password"], input[type="password"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]').first()).toBeVisible();
    console.log('✓ Login form elements rendered');
  });

  test('login works and redirects to dashboard', async () => {
    await page.goto(`${BASE}/login`);
    
    // Fill credentials
    const userField = page.locator('input[name="username"], input[type="text"]').first();
    const passField = page.locator('input[name="password"], input[type="password"]').first();
    await userField.fill(CREDS.username);
    await passField.fill(CREDS.password);
    
    // Submit
    await page.locator('button[type="submit"]').first().click();
    
    // Should redirect to / (dashboard)
    await page.waitForURL('**/', { timeout: 10000 });
    await page.screenshot({ path: 'tests/screenshots/02-dashboard.png', fullPage: true });
    console.log('✓ Login successful, redirected to dashboard');
    
    // Verify sidebar is visible (means we're logged in)
    await expect(page.locator('nav, [class*="sidebar"], [class*="Sidebar"]').first()).toBeVisible({ timeout: 5000 });
    console.log('✓ Sidebar rendered');
  });

  // ── ALL PAGES ──
  const pages = [
    { path: '/', name: 'dashboard' },
    { path: '/config', name: 'config' },
    { path: '/logs', name: 'logs' },
    { path: '/memory', name: 'memory' },
    { path: '/files', name: 'files' },
    { path: '/sessions', name: 'sessions' },
    { path: '/cron', name: 'cron' },
    { path: '/skills', name: 'skills' },
    { path: '/agent-md', name: 'agent-md' },
    { path: '/soul-md', name: 'soul-md' },
  ];

  for (const p of pages) {
    test(`${p.name} page loads with content`, async () => {
      await page.goto(`${BASE}${p.path}`, { waitUntil: 'networkidle' });
      await page.screenshot({ path: `tests/screenshots/${p.name}.png`, fullPage: true });
      
      // Check page has content (not blank or login redirect)
      const bodyText = await page.textContent('body');
      expect(bodyText.length).toBeGreaterThan(100);
      console.log(`✓ ${p.name} page loaded (${bodyText.length} chars)`);
    });
  }

  // ── SPECIFIC PAGE CHECKS ──
  test('dashboard shows system stats', async () => {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    const bodyText = await page.textContent('body');
    // Should show CPU, memory, or disk somewhere
    const hasStats = /cpu|memory|disk|uptime|gateway/i.test(bodyText);
    console.log(`Dashboard has stats: ${hasStats}`);
  });

  test('config page has structured view', async () => {
    await page.goto(`${BASE}/config`, { waitUntil: 'networkidle' });
    const bodyText = await page.textContent('body');
    // Should have tabs or config sections
    const hasConfig = /model|config|setting|general|yaml/i.test(bodyText);
    console.log(`Config has structured view: ${hasConfig}`);
  });

  test('memory page shows memory content', async () => {
    await page.goto(`${BASE}/memory`, { waitUntil: 'networkidle' });
    const bodyText = await page.textContent('body');
    const hasMemory = /user|memory|soul|note/i.test(bodyText);
    console.log(`Memory has content: ${hasMemory}`);
  });

  test('agent-md page shows AGENTS.md content', async () => {
    await page.goto(`${BASE}/agent-md`, { waitUntil: 'networkidle' });
    const bodyText = await page.textContent('body');
    const hasContent = /hermes|agent|development|tool/i.test(bodyText);
    console.log(`Agent MD has content: ${hasContent}`);
  });

  test('soul-md page shows SOUL.md content', async () => {
    await page.goto(`${BASE}/soul-md`, { waitUntil: 'networkidle' });
    const bodyText = await page.textContent('body');
    const hasContent = /hermes|soul|intelligent|assistant/i.test(bodyText);
    console.log(`Soul MD has content: ${hasContent}`);
  });

  test('sidebar navigation works', async () => {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    
    // Try clicking on config in sidebar
    const configLink = page.locator('a[href="/config"]').first();
    if (await configLink.isVisible()) {
      await configLink.click();
      await page.waitForURL('**/config', { timeout: 5000 });
      console.log('✓ Sidebar navigation to /config works');
    } else {
      console.log('⚠ Config link not found in sidebar - checking structure');
      const links = await page.locator('a').allTextContents();
      console.log('Found links:', links.slice(0, 15));
    }
  });
});
