import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Patent Navi",
  description: "事業・製品アイデアから特許調査の入口を作る一次調査支援ツール",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
