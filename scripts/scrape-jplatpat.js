const { chromium } = require('playwright');

async function lookupPatentNumber(registrationNumber) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('https://www.j-platpat.inpit.go.jp/p0000', {
      waitUntil: 'networkidle', timeout: 30000,
    });
    await page.waitForTimeout(2000);

    // 番号種別ドロップダウンを確認
    const selects = await page.evaluate(() =>
      Array.from(document.querySelectorAll('select')).map(el => ({
        id: el.id, name: el.name, cls: el.className.slice(0,50),
        options: Array.from(el.options).map(o => ({ value: o.value, text: o.text.trim() }))
      }))
    );
    console.log('Selects:', JSON.stringify(selects, null, 2));

    // 4番目の入力欄（特許番号用: placeholder "123456X"）に入力
    const input3 = await page.$('#p00_srchCondtn_txtDocNoInputNo3');
    if (input3) {
      console.log('Found input3 (特許番号フィールド)');
      await input3.fill(registrationNumber);
    } else {
      console.log('input3 not found, trying by placeholder');
      const inputs = await page.$$('input[type=text]');
      console.log('Total text inputs:', inputs.length);
      for (let i = 0; i < inputs.length; i++) {
        const ph = await inputs[i].getAttribute('placeholder');
        console.log(`Input[${i}] placeholder: ${ph}`);
      }
    }

    // スクロールしてページ全体を見る
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    // ボタン類を再確認
    const allClickable = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button, input[type=submit], a[class*=btn], a[class*=search]'))
        .map(el => ({
          tag: el.tagName, text: (el.textContent||'').trim().slice(0,40),
          id: el.id, cls: el.className.slice(0,50)
        }))
    );
    console.log('Clickable elements:', JSON.stringify(allClickable, null, 2));

    await page.screenshot({ path: 'scripts/jplatpat-filled.png', fullPage: true });
    console.log('Screenshot saved.');

  } finally {
    await browser.close();
  }
}

lookupPatentNumber('7653490').catch(e => { console.error(e.message); process.exit(1); });
