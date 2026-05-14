const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.addInitScript(() => {
    const origOpen = window.open.bind(window);
    window.open = (url, ...args) => {
      console.log('[WINDOW.OPEN]', url);
      (window).__lastOpen = url;
      return origOpen(url, ...args);
    };
  });

  try {
    await page.goto('https://www.j-platpat.inpit.go.jp/p0000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.$('#p00_srchCondtn_txtDocNoInputNo3').then(el => el.fill('7653490'));
    await page.click('#p00_searchBtn_btnDocInquiry');
    await page.waitForTimeout(3000);

    // 新しいページが開くのを待ってURLボタンをクリック
    const [newPage] = await Promise.all([
      context.waitForEvent('page', { timeout: 5000 }).catch(() => null),
      page.locator('td:has-text("URL")').first().click(),
    ]);

    if (newPage) {
      await newPage.waitForLoadState('networkidle').catch(() => {});
      console.log('New page URL:', newPage.url());
      const text = await newPage.evaluate(() => document.body.innerText.slice(0, 500));
      console.log('New page content:', text);
    } else {
      const lastOpen = await page.evaluate(() => (window).__lastOpen);
      console.log('Last window.open:', lastOpen);
    }

  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e.message); process.exit(1); });
