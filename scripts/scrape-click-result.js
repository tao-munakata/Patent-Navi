const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.j-platpat.inpit.go.jp/p0000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.$('#p00_srchCondtn_txtDocNoInputNo3').then(el => el.fill('7653490'));
    await page.click('#p00_searchBtn_btnDocInquiry');
    await page.waitForTimeout(3000);

    // 結果テーブル内のクリック可能要素を確認
    const resultLinks = await page.evaluate(() =>
      Array.from(document.querySelectorAll('td a, td button, tr[onclick], td[onclick]')).map(el => ({
        tag: el.tagName,
        text: el.textContent.trim().slice(0, 40),
        href: el.getAttribute('href'),
        onclick: el.getAttribute('onclick')?.slice(0, 80),
      }))
    );
    console.log('Result clickables:', JSON.stringify(resultLinks, null, 2));

    // 結果行の最初のリンクをクリック
    const firstResultLink = await page.$('td a');
    if (firstResultLink) {
      console.log('Clicking first result link...');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {}),
        firstResultLink.click(),
      ]);
      await page.waitForTimeout(2000);
      console.log('After click URL:', page.url());
      await page.screenshot({ path: 'scripts/jplatpat-doc.png', fullPage: false });
    }
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e.message); process.exit(1); });
