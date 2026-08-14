# HELLHOUND Club — Android (Capacitor)

Нативная Android-обёртка над клубным PWA. Дизайн 1:1 — внутри тот же React-код.

- `appId`: `pro.hhr.club`
- Имя приложения: `HELLHOUND Club`
- WebView грузит **живой** `https://club.hhr.pro` (см. `capacitor.config.ts`).
  Так сохраняется auth-cookie `hh_sid` на `.hhr.pro`, а обновления клуба
  доезжают без нового релиза в Play.

## Что нужно локально

- Node + `npm install` (или `bun install`)
- Android Studio + Android SDK (compileSdk из `android/variables.gradle`)
- JDK 21 (идёт вместе с Android Studio)
- Аккаунт Google Play Developer ($25 единоразово)

## 1. Подтянуть проект

```bash
git pull
npm install
npm run build
npx cap sync android
```

`npx cap sync` нужно запускать после каждого `git pull` и после установки
любых Capacitor-плагинов.

## 2. Keystore (один раз, потом хранить бережно)

```bash
cd android
keytool -genkey -v -keystore hhr-club-release.jks \
  -alias hhr-club -keyalg RSA -keysize 2048 -validity 10000
```

Затем скопировать `android/keystore.properties.example` →
`android/keystore.properties` и вписать пароли. Оба файла в `.gitignore`.

Потеря keystore = невозможность обновлять приложение в Play. Сделай бэкап.

## 3. Сборка .aab для Google Play

```bash
npm run android:bundle
```

Готовый файл: `android/app/build/outputs/bundle/release/app-release.aab`

Проверить локально на устройстве/эмуляторе:

```bash
npm run android:open   # открыть в Android Studio
npx cap run android    # запустить на устройстве
```

## 4. Версии релизов

Перед каждой загрузкой в Play подними в `android/app/build.gradle`:

- `versionCode` — целое, строго больше предыдущего
- `versionName` — человеческая версия, например `1.0.1`

## 5. Загрузка в Play Console

1. Play Console → Create app → название, язык, тип «App», бесплатное.
2. Заполнить Store listing (иконка 512×512, feature graphic 1024×500,
   минимум 2 скриншота телефона), Content rating, Data safety,
   Privacy policy — указать `https://hhr.pro/legal/privacy`.
3. Testing → Internal testing → создать релиз → загрузить `.aab`.
4. После проверки внутреннего теста — Production release.

## Заметки

- Play не любит «пустые» WebView-обёртки. У нас полноценное приложение с
  собственным аккаунтом, магазином и контентом — это ок, но в описании
  стоит явно рассказать про функциональность клуба.
- Оплата физического мерча через свой эквайринг (Raiffeisen) — допустимо.
  Цифровые товары и Pass в Android-сборке продавать через свой эквайринг
  нельзя: там действует Google Play Billing. Если понадобится — включим
  тот же серверный feature-flag, что для iOS (`X-Client-Platform`).
- Web-push внутри Capacitor-WebView не работает. Если нужны нативные
  пуши — подключаем `@capacitor/push-notifications` + FCM
  (`google-services.json`) отдельной задачей.
