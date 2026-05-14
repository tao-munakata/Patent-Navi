const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();

  // navigator.clipboard.writeText をインターセプト
  await page.addInitScript(() => {
    const original = navigator.clipboard.writeText.bind(navigator.clipboard);
    navigator.clipboard.writeText = async (text) => {
      (window).__clipboardWrites = (window).__clipboardWrites || [];
      (window).__clipboardWrites.push(text);
      console.log('[CLIPBOARD]', text);
      return original(text);
    };
    // window.open もインターセプト
    const origOpen = window.open.bind(window);
    window.open = (...args) => {
      console.log('[WINDOW.OPEN]', args[0]);
      (window).__windowOpens = (window).__windowOpens || [];
      (window).__windowOpens.push(args[0]);
      return origOpen(...args);
    };
  });

  try {
    await page.goto('https://www.j-platpat.inpit.go.jp/p0000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.$('#p00_srchCondtn_txtDocNoInputNo3').then(el => el.fill('7653490'));
    await page.click('#p00_searchBtn_btnDocInquiry');
    await page.waitForTimeout(3000);

    // URLボタンをクリック
    await page.locator('td:has-text("URL")').first().click();
    await page.waitForTimeout(1000);

    const clips = await page.evaluate(() => (window).__clipboardWrites || []);
    const opens = await page.evaluate(() => (window).__windowOpens || []);
    console.log('Clipboard writes:', clips);
    console.log('Window opens:', opens);

  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e.message); process.exit(1); });
