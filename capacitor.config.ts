import type { CapacitorConfig } from "@capacitor/cli";

const origin = process.env.LOG_NOTE_MOBILE_ORIGIN || "http://127.0.0.1:3100";
const isLocalOrigin = origin.startsWith("http://127.0.0.1") || origin.startsWith("http://localhost");

const config: CapacitorConfig = {
  appId: process.env.LOG_NOTE_MOBILE_APP_ID || "online.kual.lognote",
  appName: "Log Note",
  webDir: "mobile-web",
  server: {
    url: origin,
    cleartext: isLocalOrigin,
    allowNavigation: [new URL(origin).hostname]
  },
  android: {
    allowMixedContent: isLocalOrigin
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#f7f4ed"
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#f7f4ed"
    }
  }
};

export default config;
