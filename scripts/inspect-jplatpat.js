const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.j-platpat.inpit.go.jp/?uri=/p0000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(4000);

    console.log('URL:', page.url());
    console.log('Title:', await page.title());

    const inputs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('input')).map(el => ({
        type: el.type, placeholder: el.placeholder, id: el.id, name: el.name, cls: el.className.slice(0,50)
      }))
    );
    console.log('--- inputs ---');
    console.log(JSON.stringify(inputs.slice(0, 15), null, 2));

    const buttons = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button')).map(el => ({
        text: (el.textContent || '').trim().slice(0, 40), id: el.id, cls: el.className.slice(0, 50)
      }))
    );
    console.log('--- buttons ---');
    console.log(JSON.stringify(buttons.slice(0, 15), null, 2));

    const tabs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[role=tab], .tab, li[class*=tab]')).map(el => ({
        text: (el.textContent || '').trim().slice(0, 30), cls: el.className.slice(0, 50)
      }))
    );
    console.log('--- tabs ---');
    console.log(JSON.stringify(tabs.slice(0, 10), null, 2));

    // スクリーンショット
    await page.screenshot({ path: 'scripts/jplatpat.png', fullPage: false });
    console.log('Screenshot saved.');
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e.message); process.exit(1); });
