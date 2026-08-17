/**
 * @fileoverview 声明 Log Note 的页面元数据、视口与根布局。
 */

import "./globals.css";
import "@fontsource/instrument-sans/400.css";
import "@fontsource/instrument-sans/400-italic.css";
import "@fontsource/instrument-sans/600.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import { I18nProvider } from "./i18n";
import { ServiceWorkerRegistration } from "./service-worker-registration";
import { AuthGate, AuthProvider } from "./auth-provider";
import { LogNoteDataProvider } from "./log-note-data-provider";
import { GoogleCalendarProvider } from "./google-calendar-provider";
import "./auth-gate.css";

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
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" }
    ],
    apple: "/icon-192.png"
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f4ed"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ServiceWorkerRegistration />
        <I18nProvider>
          <AuthProvider>
            <AuthGate>
              <LogNoteDataProvider><GoogleCalendarProvider>{children}</GoogleCalendarProvider></LogNoteDataProvider>
            </AuthGate>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
