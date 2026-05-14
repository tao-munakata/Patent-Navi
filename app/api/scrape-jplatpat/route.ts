import { NextResponse } from "next/server";
import { chromium } from "playwright";

export async function POST(request: Request) {
  const { registrationNumber } = (await request.json()) as { registrationNumber: string };
  const regNum = registrationNumber.replace(/\D/g, "");
  if (!regNum) {
    return NextResponse.json({ error: "登録番号が無効です" }, { status: 400 });
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto("https://www.j-platpat.inpit.go.jp/p0000", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.waitForTimeout(2000);

    const input = await page.$("#p00_srchCondtn_txtDocNoInputNo3");
    if (!input) throw new Error("特許番号入力フィールドが見つかりません");
    await input.fill(regNum);

    await page.click("#p00_searchBtn_btnDocInquiry");
    await page.waitForTimeout(3000);

    const bodyText = await page.evaluate(() => document.body.innerText);

    // 「特願YYYY-NNNNNN」を抽出
    const match = bodyText.match(/特願(\d{4}-\d{6})/);
    if (!match) {
      return NextResponse.json({ error: "出願番号が見つかりませんでした" }, { status: 404 });
    }

    const applicationNumber = `特願${match[1]}`;
    // JPO API用: digits only
    const applicationNumberDigits = match[1].replace("-", "");

    return NextResponse.json({ applicationNumber, applicationNumberDigits });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "スクレイピングエラー" },
      { status: 500 }
    );
  } finally {
    await browser.close();
  }
}
