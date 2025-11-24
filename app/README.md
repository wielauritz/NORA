# NORA Mobile App Shell

Minimale Hybrid-App-Struktur für NORA, die Inhalte vom Server lädt.

## 📁 Struktur

```
app/
├── index.html          # Shell mit Preloader & Offline-Screen
├── config.js           # App-Konfiguration
├── css/
│   ├── shell.css       # Layout & Screens Styling
│   └── preloader.css   # Animationen
├── js/
│   ├── storage.js      # Token Storage (Capacitor Preferences)
│   ├── content-loader.js  # Lädt HTML vom Server
│   └── shell.js        # Hauptlogik & Orchestrierung
└── README.md           # Diese Datei
```

## 🚀 Wie es funktioniert

### 1. App Start
- **index.html** wird als Shell geladen
- Zeigt **Preloader** an
- Startet **10 Sekunden Timeout**

### 2. Authentication Check
- Prüft ob **Token** in Capacitor Preferences gespeichert ist
- Kein Token → Lade `login.html` vom Server
- Token vorhanden → Validiere mit `/v1/user` API
  - ✅ Gültig → Lade `dashboard.html`
  - ❌ Ungültig → Lösche Token, lade `login.html`

### 3. Content Loading
- HTML wird von `https://new.nora-nak.de/{page}.html` geladen
- Content wird in `#app-container` injiziert
- Scripts & Stylesheets werden dynamisch geladen
- Preloader wird ausgeblendet

### 4. Timeout/Fehler
- Nach 10 Sekunden ohne Erfolg → **Offline Screen**
- "Du scheinst offline zu sein" Nachricht
- **"Neu laden"** Button → `window.location.reload()`

## 💾 Storage

**Verwendet Capacitor Preferences** (überlebt App-Restarts!):
- `auth_token` - JWT Token
- `user_data` - User Informationen
- `last_page` - Zuletzt besuchte Seite

**NICHT localStorage** - das wird bei App-Restart gelöscht!

## 🔧 Build & Deploy

### Entwicklung (Web)
```bash
# Einfach index.html in Browser öffnen
# Storage fällt auf localStorage zurück
```

### iOS Build
```bash
cd frontend/

# 1. Sync app/ Ordner zu iOS
npm run sync:ios

# 2. Öffne in Xcode
npx cap open ios

# 3. Build & Run
```

### Android Build
```bash
cd frontend/

# 1. Sync app/ Ordner zu Android
npm run sync:android

# 2. Öffne in Android Studio
npx cap open android

# 3. Build & Run
```

## 🎨 Anpassungen

### Server URL ändern
**config.js:**
```javascript
const AppConfig = {
    SERVER_URL: 'https://new.nora-nak.de',
    API_BASE_URL: 'https://api.new.nora-nak.de/v1',
    // ...
};
```

### Timeout ändern
**config.js:**
```javascript
TIMEOUT: {
    GLOBAL: 10000,  // 10 Sekunden
    AUTH: 5000,     // 5 Sekunden
    CONTENT: 10000  // 10 Sekunden
}
```

### Styling anpassen
- **shell.css** - Layout, Farben, Screens
- **preloader.css** - Animationen

### Logo ändern
**index.html:** (Zeile ~17)
```html
<svg class="logo-animated" viewBox="0 0 200 200">
    <!-- Dein Logo hier -->
</svg>
```

## 🔌 Capacitor Plugins

### Bereits installiert:
- `@capacitor/core` - Core Funktionalität
- `@capacitor/preferences` - Storage (Token)
- `@capacitor/filesystem` - Datei-Zugriff
- `@capacitor/ios` - iOS Platform
- `@capacitor/android` - Android Platform

### Verwendung in Code:
```javascript
// Storage
await window.Capacitor.Plugins.Preferences.set({
    key: 'auth_token',
    value: token
});

const { value } = await window.Capacitor.Plugins.Preferences.get({
    key: 'auth_token'
});
```

## 🐛 Debugging

### Console Logs aktivieren:
**config.js:**
```javascript
ENABLE_LOGGING: true
```

### Logs anzeigen:
- **iOS**: Xcode → Debug Area → Console
- **Android**: Android Studio → Logcat
- **Web**: Browser DevTools → Console

### Häufige Logs:
```
[Shell] Initializing NORA Mobile App...
[Storage] Token retrieved from Capacitor Preferences: true
[Shell] Token found - validating...
[Shell] Token valid - navigating to dashboard
[ContentLoader] Loading page: https://new.nora-nak.de/dashboard.html
[ContentLoader] Page loaded successfully: dashboard.html
```

## 📱 Unterschiede zu frontend/

| Aspekt | **app/** (Mobile) | **frontend/** (Web) |
|--------|------------------|---------------------|
| Zweck | Mobile App Shell | Web App |
| Content | Vom Server geladen | Lokal embedded |
| Storage | Capacitor Preferences | localStorage |
| Updates | Automatisch (Server) | Bei Deploy |
| Größe | ~50 KB | ~5 MB |
| Offline | Nur Offline-Screen | Voll funktional |

## 🚨 Wichtig

1. **Token Storage**: Nur Capacitor Preferences verwenden!
2. **CORS**: Server muss CORS für `https://new.nora-nak.de` erlauben
3. **HTTPS**: Alle URLs müssen HTTPS sein (iOS Anforderung)
4. **Scripts**: Externe Scripts müssen vom Server geladen werden
5. **Navigation**: Nutze `window.Shell.navigateTo('DASHBOARD')` statt direkter Links

## 🔄 Update-Prozess

### Frontend-Änderungen aktualisieren:
1. Ändere Dateien in `frontend/`
2. Deploy zu `new.nora-nak.de`
3. App lädt automatisch neue Version beim nächsten Start
4. **Kein App Store Update nötig!** 🎉

### Shell-Änderungen aktualisieren:
1. Ändere Dateien in `app/`
2. `npm run sync` (in frontend/)
3. Build neue App-Version
4. **App Store Update nötig** ⚠️

## 📞 Support

Bei Fragen oder Problemen:
- Check Console Logs
- Prüfe Network Tab (DevTools)
- Teste in Web-Browser zuerst
- Prüfe Capacitor Config

## 🎯 Nächste Schritte

- [ ] Test auf iOS Gerät
- [ ] Test auf Android Gerät
- [ ] Offline-Caching implementieren (optional)
- [ ] Push Notifications (optional)
- [ ] Biometric Auth (optional)
