import type { CapacitorConfig } from "@capacitor/cli";

// Android-обёртка над клубным PWA.
//
// Приложение грузит живой сайт club.hhr.pro, а не локальный бандл:
//   - auth-cookie `hh_sid` выставлена на `.hhr.pro`, поэтому WebView должен
//     работать НА этом домене, иначе запросы к api.hhr.pro станут cross-site
//     и сессия отвалится;
//   - обновления клуба доезжают до пользователей сразу, без релиза в Play.
// Локальный `dist` остаётся в webDir как обязательный для Capacitor артефакт
// (используется при офлайн-фоллбэке и при сборке).
const config: CapacitorConfig = {
  appId: "pro.hhr.club",
  appName: "HELLHOUND Club",
  webDir: "dist",
  android: {
    allowMixedContent: false,
    backgroundColor: "#050505",
  },
  server: {
    url: "https://club.hhr.pro",
    hostname: "club.hhr.pro",
    androidScheme: "https",
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: "#050505",
      androidSplashResourceName: "splash",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersiveType: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#050505",
      overlaysWebView: true,
    },
  },
};

export default config;
