/**
 * @fileoverview 声明 Log Note 的页面元数据、视口与根布局。
 */

import "./globals.css";
import { I18nProvider } from "./i18n";
import { ServiceWorkerRegistration } from "./service-worker-registration";

export const metadata = {
  title: {
    default: "Log Note",
    template: "%s · Log Note"
  },
  description: "Tap once. Remember today.",
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
  viewportFit: "cover",
  themeColor: "#f4f1ea"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ServiceWorkerRegistration />
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
