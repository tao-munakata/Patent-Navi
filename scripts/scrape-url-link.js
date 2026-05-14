const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = browser.contexts()[0] ?? await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('https://www.j-platpat.inpit.go.jp/p0000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.$('#p00_srchCondtn_txtDocNoInputNo3').then(el => el.fill('7653490'));
    await page.click('#p00_searchBtn_btnDocInquiry');
    await page.waitForTimeout(3000);

    // 「URL」リンクをクリックして新タブを待つ
    const [newPage] = await Promise.all([
      context.waitForEvent('page', { timeout: 8000 }).catch(() => null),
      page.locator('text=URL').first().click(),
    ]);

    if (newPage) {
      await newPage.waitForLoadState('networkidle').catch(() => {});
      console.log('New page URL:', newPage.url());
    } else {
      // 新タブが開かなかった場合: 現在のURLを確認
      await page.waitForTimeout(2000);
      console.log('Current URL:', page.url());

      // ページ内のフレームURLも確認
      const frames = page.frames();
      for (const f of frames) {
        console.log('Frame URL:', f.url());
      }

      // DOM変化を確認
      const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
      console.log('Body text:', bodyText);
    }
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e.message); process.exit(1); });
