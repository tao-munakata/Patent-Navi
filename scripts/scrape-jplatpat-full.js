const { chromium } = require('playwright');

async function getApplicationNumber(registrationNumber) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('https://www.j-platpat.inpit.go.jp/p0000', {
      waitUntil: 'networkidle', timeout: 30000,
    });
    await page.waitForTimeout(2000);

    // 特許番号フィールドに入力
    const input3 = await page.$('#p00_srchCondtn_txtDocNoInputNo3');
    if (!input3) throw new Error('特許番号入力フィールドが見つかりません');
    await input3.fill(registrationNumber);
    console.log('入力完了:', registrationNumber);

    // 照会ボタンをクリック
    await page.click('#p00_searchBtn_btnDocInquiry');
    console.log('照会ボタンクリック');

    // 結果ページ / 書誌詳細が表示されるまで待機
    await page.waitForTimeout(3000);

    // 現在のURLを確認
    console.log('現在のURL:', page.url());

    // スクリーンショット
    await page.screenshot({ path: 'scripts/jplatpat-result.png', fullPage: true });

    // 書誌データを探す
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('ページテキスト（先頭2000文字）:\n', bodyText.slice(0, 2000));

    // 出願番号を探す
    const appNumMatch = bodyText.match(/出願番号[^\d]*(特願?\s*[\d-]+)/);
    if (appNumMatch) {
      console.log('出願番号発見:', appNumMatch[1]);
    }

    // ページ内のすべての dt/dd ペアを抽出
    const dtdd = await page.evaluate(() => {
      const result = [];
      document.querySelectorAll('dt').forEach(dt => {
        const dd = dt.nextElementSibling;
        if (dd) result.push({ label: dt.textContent.trim(), value: dd.textContent.trim() });
      });
      return result;
    });
    console.log('dt/ddペア:', JSON.stringify(dtdd.slice(0, 20), null, 2));

    // テーブルセルも確認
    const tableCells = await page.evaluate(() => {
      const result = [];
      document.querySelectorAll('th').forEach(th => {
        const td = th.nextElementSibling;
        if (td) result.push({ label: th.textContent.trim(), value: td.textContent.trim() });
      });
      return result;
    });
    console.log('th/tdペア:', JSON.stringify(tableCells.slice(0, 20), null, 2));

  } finally {
    await browser.close();
  }
}

getApplicationNumber('7653490').catch(e => { console.error(e.message); process.exit(1); });
