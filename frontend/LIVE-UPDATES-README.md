# NORA Live Updates - Dokumentation

## Übersicht

NORA verwendet `@capgo/capacitor-updater` um automatische Live-Updates der Web-Inhalte (HTML/CSS/JS) durchzuführen, ohne dass ein App Store Update nötig ist.

## Wie es funktioniert

1. **App-Start**: App sendet `notifyAppReady()` Signal und prüft auf Updates
2. **Update-Check**: Lädt Manifest von `https://new.nora-nak.de/updates/manifest.json`
3. **Download**: Wenn neue Version verfügbar → Download ZIP-Bundle im Hintergrund
4. **Apply**: Beim nächsten App-Start (oder wenn App in Background geht) → Switch zur neuen Version
5. **Rollback**: Bei 3 Crashes → Automatischer Rollback zur vorherigen Version

## Server-Setup

### Verzeichnis-Struktur

Erstelle folgende Struktur auf deinem Server:

```
https://new.nora-nak.de/updates/
├── manifest.json          # Aktuelle Version-Info
└── bundles/
    ├── 1.0.0.zip         # Version Bundles
    ├── 1.0.1.zip
    └── 1.0.2.zip
```

### Manifest Format

`manifest.json` sollte so aussehen:

```json
{
  "version": "1.0.1",
  "url": "https://new.nora-nak.de/updates/bundles/1.0.1.zip",
  "releaseNotes": "Bug fixes and performance improvements",
  "minAppVersion": "1.0.0",
  "timestamp": "2025-11-06T10:30:00Z"
}
```

## Update erstellen und deployen

### Schritt 1: Build die App

```bash
npm run build
```

Dies erstellt die Web-Assets im `www/` Ordner.

### Schritt 2: Bundle erstellen

```bash
cd www
zip -r ../1.0.1.zip ./*
cd ..
```

**WICHTIG**: Der ZIP muss die Inhalte von `www/` direkt enthalten, NICHT in einem Unterordner!

Richtige Struktur:
```
1.0.1.zip
├── index.html
├── js/
└── css/
```

Falsche Struktur:
```
1.0.1.zip
└── www/
    ├── index.html
    ├── js/
    └── css/
```

### Schritt 3: Zu Server hochladen

1. Upload `1.0.1.zip` zu `https://new.nora-nak.de/updates/bundles/1.0.1.zip`
2. Update `manifest.json` mit neuer Version

### Deployment-Script (Optional)

Nutze das bereitgestellte Script:

```bash
chmod +x deploy-update.sh
./deploy-update.sh 1.0.1
```

## Testing

### 1. Update Download testen

1. Erstelle neue Version (z.B. 1.0.1)
2. Deploye zu Server
3. Öffne App
4. Prüfe Logs: `[AppUpdater] New version available: 1.0.1`
5. Prüfe Logs: `[AppUpdater] Download complete`

### 2. Update Apply testen

1. Mit heruntergeladenem Update
2. Schließe App (Background)
3. Öffne App neu
4. Prüfe Logs: `[AppUpdater] Applying update`
5. App sollte mit neuer Version starten

### 3. Rollback testen

1. Erstelle absichtlich fehlerhaftes Update (z.B. kaputter HTML Code)
2. Deploye Update
3. App lädt fehlerhafte Version
4. App crasht 3x
5. App sollte automatisch zur vorherigen funktionierenden Version zurückkehren

## Wichtige Hinweise

### ✅ Was du updaten kannst

- HTML Dateien
- CSS Dateien
- JavaScript Dateien
- Bilder und Assets

### ❌ Was du NICHT updaten kannst

- Native Code (Swift/Kotlin)
- Capacitor Plugins
- App Permissions
- App Icons/Splash Screens

Für diese Änderungen brauchst du ein App Store Update!

### 🔒 App Store Compliance

- **Apple**: Erlaubt Updates für Bug-Fixes und kleine Änderungen
- **Vermeide**: Komplett neue Features via Live-Update zu pushen
- **Nutze**: Für Bug-Fixes, UI-Tweaks, Content-Updates

### 📏 Best Practices

1. **Teste gründlich**: Ein fehlerhaftes Update kann Apps crashen lassen
2. **Halte Bundles klein**: < 50MB für gute Download-Performance
3. **Verwende Semantic Versioning**: 1.0.0 → 1.0.1 → 1.1.0
4. **Behalte alte Bundles**: Für manuellen Rollback falls nötig
5. **Monitor Update Success**: Schaue ob Updates erfolgreich angewendet werden

## Troubleshooting

### Problem: Updates werden nicht heruntergeladen

**Lösung**:
- Prüfe ob `manifest.json` erreichbar ist
- Prüfe Netzwerk-Verbindung
- Prüfe ob Version im Manifest höher ist als installierte Version
- Prüfe Logs für Fehler

### Problem: Update wird heruntergeladen aber nicht angewendet

**Lösung**:
- Prüfe ob `notifyAppReady()` aufgerufen wird
- Schließe App komplett und öffne neu
- Prüfe Logs für Fehler

### Problem: App crasht nach Update

**Lösung**:
- App wird automatisch nach 3 Crashes zur vorherigen Version zurückkehren
- Prüfe was im Update kaputt ist
- Erstelle Fix und deploye neue Version

### Manueller Rollback

Wenn du manuell zur gebundelten Version zurückkehren willst:

```javascript
// In Browser Console ausführen:
await appUpdater.resetToBuiltIn();
```

## Weitere Informationen

- **Plugin Dokumentation**: https://github.com/Cap-go/capacitor-updater
- **Capacitor Docs**: https://capacitorjs.com/docs

## Support

Bei Problemen:
1. Prüfe Browser Console Logs
2. Prüfe XCode/Android Studio Logs
3. Prüfe ob Manifest und Bundles korrekt auf Server liegen
