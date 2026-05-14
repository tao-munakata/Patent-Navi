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

    // 結果行のリンクを全部取得
    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a')).map(a => ({
        text: a.textContent.trim().slice(0, 30),
        href: a.href,
      })).filter(l => l.href && !l.href.startsWith('javascript'))
    );
    console.log(JSON.stringify(links, null, 2));
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e.message); process.exit(1); });
