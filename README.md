# ₍ᐢ. ̫ .ᐢ₎ - Kids Toy Beep App

A cute, tactile web app inspired by the pair of kittens (Bat-Kitten & Bow-Kitten) designed to be installed on Android as an APK / WebAPK.

## 🌟 Highlights
- **Kids Toy Console Aesthetic**: Soft pastel candy-shell console, rounded ears, glowing status LED, and interactive Bat-Cat & Bow-Cat avatars.
- **Giant Central Button**: Chunky 3D glossy toy button with spring-loaded tactile physics, shockwave aura, and particle bursts.
- **Pleasant "Beep Beep Beep" Chime**: Synthesized 3-tone musical chime (E6 → G#6 → B6 with warm bell harmonics) plus rhythmic triple-vibration haptics.
- **Pure Mystery**: Zero instructions or explanatory text inside the toy interface — just pure, whimsical tactile fun.
- **Two Ways to Install as Android APK**:
  1. **Instant WebAPK (PWA)**: Open the site in Chrome on Android and tap **"Install App"** / **"Add to Home screen"**. Android compiles and installs it directly as a native APK on your home screen.
  2. **Native Android APK (Capacitor)**: Open the included `android/` project in Android Studio and select **Build > Build APK**.

## 🚀 Running the Server
```bash
npm start
```
The server will start on `http://localhost:3000` (or access via your local network IP from your phone, e.g., `http://192.168.x.x:3000`).

## 🐾 How the Pair Works
- One person selects **Bat Kitten** (left avatar).
- The other person selects **Bow Kitten** (right avatar).
- When one taps the big center button, the other person's phone immediately receives a notification saying **`beep beep beep`** and plays the sweet toy chime!

