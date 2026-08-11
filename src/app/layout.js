/**
 * @fileoverview 声明 Log Note 的页面元数据、视口与根布局。
 */

import "./globals.css";

export const metadata = {
  title: "Log Note",
  description: "点一下，记住今天。",
  applicationName: "Log Note",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Log Note"
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg"
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#f4f1ea"
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
