const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // ネットワークリクエストを記録
  const requests = [];
  page.on('request', req => {
    if (!req.url().includes('j-platpat')) return;
    requests.push({ method: req.method(), url: req.url() });
  });

  try {
    await page.goto('https://www.j-platpat.inpit.go.jp/p0000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    requests.length = 0; // ここまでのリクエストをリセット

    await page.$('#p00_srchCondtn_txtDocNoInputNo3').then(el => el.fill('7653490'));
    await page.click('#p00_searchBtn_btnDocInquiry');
    await page.waitForTimeout(3000);
    requests.length = 0; // 検索リクエストもリセット

    // 「特許7653490」をクリック
    await page.locator('text=特許7653490').first().click();
    await page.waitForTimeout(3000);

    console.log('Click後のリクエスト:');
    requests.forEach(r => console.log(r.method, r.url));

    // URLボタンをクリック
    requests.length = 0;
    await page.locator('text=URL').first().click();
    await page.waitForTimeout(2000);
    console.log('\nURL click後のリクエスト:');
    requests.forEach(r => console.log(r.method, r.url));

    // クリップボードを試す
    const clipText = await page.evaluate(async () => {
      try { return await navigator.clipboard.readText(); } catch { return null; }
    });
    console.log('\nClipboard:', clipText);

  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e.message); process.exit(1); });
