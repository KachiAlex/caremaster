// Repro: mobile tap on conversation should open chat pane
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 300)); });
  page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0, 500)));

  console.log('1. Loading login...');
  await page.goto('https://getcaremaster.com/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'repro-1-login.png' });

  // Fill login form
  const emailInput = await page.$('input[type="email"], input[name="email"], input[placeholder*="mail" i]');
  const passInput = await page.$('input[type="password"]');
  if (!emailInput || !passInput) {
    console.log('No login inputs found. URL:', page.url());
    await page.screenshot({ path: 'repro-1b.png' });
    await browser.close();
    return;
  }
  await emailInput.fill('admin@bulah.com');
  await passInput.fill('admin1234');
  await page.screenshot({ path: 'repro-2-filled.png' });

  const submitBtn = await page.$('button[type="submit"], button:has-text("Sign"), button:has-text("Log"), button:has-text("Login")');
  if (submitBtn) await submitBtn.click(); else await passInput.press('Enter');

  console.log('2. Waiting for dashboard...');
  await page.waitForTimeout(10000);
  await page.screenshot({ path: 'repro-3-after-login.png' });
  console.log('   URL:', page.url());

  // Handle "You're already signed in" interstitial
  const contBtn = await page.$('button:has-text("Continue to Dashboard")');
  if (contBtn) {
    console.log('   -> "already signed in" interstitial; continuing...');
    await contBtn.click();
    await page.waitForTimeout(8000);
    await page.screenshot({ path: 'repro-3b-continued.png' });
    console.log('   URL:', page.url());
  }

  // Go to messages tab via URL param (tab button lives in the off-canvas sidebar)
  console.log('3. Opening messages tab...');
  const dashBase = page.url().split('?')[0];
  const inst = new URL(page.url()).searchParams.get('institution') || '559fdd3b-f98e-46f8-b295-4cdaf20127d5';
  await page.goto(`${dashBase}?institution=${inst}&tab=messages`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(8000);
  await page.screenshot({ path: 'repro-4-messages.png' });
  console.log('   URL:', page.url());

  // Find conversation rows
  console.log('4. Looking for conversation rows...');
  await page.waitForTimeout(3000);
  const convCount = await page.locator('text=/\\d+ conversation/').count();
  console.log('   conversation count label found:', convCount > 0);

  let rows = page.locator('div.cursor-pointer:has(h3), button.w-full:has(h3), button.w-full.text-left');
  let n = await rows.count();
  console.log('   rows found:', n);

  if (n === 0) {
    // No conversations — create one via the "+" new-conversation picker
    console.log('   No rows; opening new-conversation picker...');
    const addBtn = page.locator('button[title="Start new chat"], button[title="Start a new conversation"]').first();
    console.log('   + button found:', await addBtn.count() > 0);
    if (await addBtn.count()) {
      await addBtn.click({ force: true });
      await page.waitForTimeout(2500);
      await page.screenshot({ path: 'repro-4b-picker.png' });
      const members = page.locator('div.fixed div.cursor-pointer, div.fixed li, div.fixed [role="listitem"], div.fixed button:has(h3), div.fixed button:has(p), [role="dialog"] button');
      const mc = await members.count();
      console.log('   picker candidates:', mc);
      if (mc > 0) {
        await members.first().click({ force: true });
        await page.waitForTimeout(2000);
      }
      await page.screenshot({ path: 'repro-4c-after-pick.png' });
    }
    rows = page.locator('div.cursor-pointer:has(h3), button.w-full:has(h3), button.w-full.text-left');
    n = await rows.count();
    console.log('   rows after picker:', n);
  }

  console.log('5. Tapping first conversation...');
  if (n > 0) {
    await rows.first().tap().catch(async () => { await rows.first().click({ force: true }); });
  }
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'repro-5-after-tap.png' });

  // Check if chat pane is visible: look for composer input or back button
  const backBtn = await page.locator('button[aria-label="Back to conversations"]').isVisible().catch(() => false);
  const composer = await page.locator('input[placeholder*="message" i], textarea[placeholder*="message" i]').isVisible().catch(() => false);
  const listVisible = await page.locator('text=/\\d+ conversation/').isVisible().catch(() => false);
  console.log('   RESULT: backBtn=', backBtn, 'composer=', composer, 'listStillVisible=', listVisible);

  // Send a test message if the chat opened
  if (composer) {
    console.log('6. Sending a test message...');
    const msgInput = page.locator('input[placeholder*="message" i], textarea[placeholder*="message" i]').first();
    await msgInput.fill('Test ping ' + Date.now());
    const sendBtn = page.locator('button:has-text("Send"), button[type="submit"]').first();
    await sendBtn.click().catch(() => msgInput.press('Enter'));
    await page.waitForTimeout(4000);
    const toast = await page.locator('text=/Failed to send/i').isVisible().catch(() => false);
    const sent = await page.locator('text=/Test ping/').isVisible().catch(() => false);
    await page.screenshot({ path: 'repro-6-sent.png' });
    console.log('   RESULT: sent visible=', sent, 'failToast=', toast);
  }

  // Verify back button returns to list
  if (backBtn) {
    await page.locator('button[aria-label="Back to conversations"]').tap();
    await page.waitForTimeout(1500);
    const listBack = await page.locator('text=/\\d+ conversation/').isVisible().catch(() => false);
    await page.screenshot({ path: 'repro-7-back.png' });
    console.log('   after back: listVisible=', listBack);
  }

  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
