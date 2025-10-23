# NORA - Nordakademie Organizer & Room Assistant

<div align="center">
  <img src="https://cdn.nora-nak.de/img/logo.png" alt="NORA Logo" width="200"/>

  **Eine moderne, studentenzentrierte Plattform für die Nordakademie**

  [![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
  [![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
  [![Capacitor](https://img.shields.io/badge/Capacitor-7.4-119EFF.svg)](https://capacitorjs.com/)
  [![Go](https://img.shields.io/badge/Go-1.21-00ADD8.svg)](https://golang.org/)
</div>

---

## 📋 Inhaltsverzeichnis

- [Über NORA](#-über-nora)
- [Features](#-features)
- [Technologie-Stack](#%EF%B8%8F-technologie-stack)
- [Architektur](#%EF%B8%8F-architektur)
- [API-Dokumentation](#-api-dokumentation)
- [Entwickler](#‍-entwickler)
- [Contributing](#-contributing)
- [Lizenz](#-lizenz)
- [Kontakt](#-kontakt--support)

---

## 🎯 Über NORA

NORA (Nordakademie Organizer & Room Assistant) ist eine umfassende Web-Plattform, die speziell für Studierende der Nordakademie entwickelt wurde. Die Anwendung vereint alle wichtigen organisatorischen Tools in einer intuitiven, modernen Oberfläche und macht das Studentenleben deutlich einfacher.

### Vision

Unsere Vision ist es, den Studienalltag an der Nordakademie durch intelligente Digitalisierung zu vereinfachen. NORA bietet nicht nur Zugriff auf wichtige Informationen wie Stundenpläne und Raumbelegungen, sondern fördert auch die Vernetzung unter Studierenden und ermöglicht eine bessere Organisation des akademischen Lebens.

### Motivation

NORA entstand aus dem Bedürfnis heraus, die verschiedenen organisatorischen Aspekte des Studiums an der Nordakademie zu zentralisieren. Anstatt zwischen verschiedenen Systemen und Plattformen zu wechseln, bietet NORA eine einheitliche Lösung für:

- **Stundenplanverwaltung**: Übersichtliche Darstellung aller Veranstaltungen mit Zeitangaben, Räumen und Dozenten
- **Raumplanung**: Interaktive Gebäudepläne mit Echtzeitinformationen zur Raumbelegung
- **Prüfungsorganisation**: Verwaltung und Übersicht über anstehende Klausuren
- **Soziale Vernetzung**: Freundeslisten und gemeinsame Stundenplanansichten
- **Kalenderintegration**: Export und Synchronisation mit externen Kalendern

---

## ✨ Features

### 🗓️ Intelligente Stundenplanverwaltung

- **Personalisierte Ansicht**: Automatische Filterung nach Zenturie
- **Zeitbereichsauswahl**: Flexible Darstellung von 0-24 Uhr
- **Freundschafts-Feature**: Einsicht in Stundenpläne von Kommilitonen
- **Custom Hours**: Eigene Termine und Veranstaltungen hinzufügen
- **Raumsuche**: Schnelles Finden freier Räume für bestimmte Zeitslots

### 🏢 Interaktiver Raumplan

- **Gebäudeübersicht**: Detaillierte Pläne für alle Nordakademie-Gebäude
- **Stockwerksnavigation**: Etagenweise Ansicht mit Raumdetails
- **Rauminformationen**:
  - Raumnummer und Name
  - Aktuelle Belegung
  - Nächste Veranstaltung
  - Kapazität und Ausstattung
- **Such- und Filterfunktion**: Schnelles Auffinden spezifischer Räume
- **Echtzeit-Belegungsstatus**: Sofortige Übersicht über freie Räume

### 📚 Klausurenverwaltung

- **Klausurübersicht**: Chronologische Auflistung anstehender Prüfungen
- **Intelligente Eingabe**:
  - Autocomplete für Modulnummern
  - Autocomplete für Kursnamen
  - Automatische Synchronisation beider Felder
- **Prüfungsdetails**:
  - Datum und Uhrzeit
  - Dauer
  - Raum
  - Kurs und Modulnummer
- **Countdown**: Anzeige der verbleibenden Zeit bis zur Klausur

### 👥 Soziale Features

- **Freundesliste**: Verwaltung von Kontakten innerhalb der Plattform
- **Stundenplan-Sharing**: Einsicht in die Zeitpläne von Freunden
- **Zenturien-Anzeige**: Übersicht über die Zenturien aller Freunde
- **Validierung**: Nur @nordakademie.de E-Mail-Adressen

### 📅 Kalender-Integration

- **Webcal-Export**: Automatischer Import in alle gängigen Kalender-Apps
- **iCal-Download**: Manuelle Kalender-Integration
- **Plattform-Support**:
  - Apple Kalender (macOS, iOS)
  - Google Kalender
  - Microsoft Outlook
  - Andere iCal-kompatible Anwendungen
- **Automatische Updates**: Änderungen werden in Echtzeit synchronisiert

### 🔍 Globale Suche

- **Schnellsuche**: Strg+K / Cmd+K für sofortigen Zugriff
- **Kategorien**:
  - Kurse
  - Räume
  - Zenturien
  - Dozenten
- **Live-Ergebnisse**: Sofortige Anzeige während der Eingabe
- **Keyboard-Navigation**: Vollständige Tastatursteuerung

### 🎨 Modernes UI/UX Design

- **Responsive Design**: Optimiert für Desktop, Tablet und Mobile
- **Glassmorphism**: Moderne, transparente Designelemente
- **Gradient Accents**: Farbverläufe im Nordakademie-Branding
- **Dark Mode Ready**: Vorbereitet für zukünftige Dark-Mode-Integration
- **Accessibility**: Barrierefreie Bedienung
- **Performance**: Optimierte Ladezeiten und flüssige Animationen

---

## 🛠️ Technologie-Stack

### Frontend

#### Core Technologies
- **HTML5** - Strukturierung der Anwendung
- **CSS3** - Modernes Styling mit Glassmorphism
- **JavaScript ES6+** - Clientseitige Logik und Interaktivität
- **TailwindCSS 3.x** - Utility-First CSS Framework via CDN
- **Capacitor 7.x** - Native Mobile App Wrapper (iOS & Android)

#### Features & Utilities
- **Fetch API** - HTTP-Requests und API-Kommunikation
- **LocalStorage API** - Client-Side Session Persistence
- **DOM API** - Dynamische UI-Updates
- **Native Modules** - Zugriff auf Device-Features via Capacitor

### Backend

#### Framework & Core
- **Go 1.21+** - Hochperformante Backend-Sprache
- **Fiber v2** - Express-inspiriertes Web Framework
- **GORM** - ORM für Datenbankzugriff
- **PostgreSQL 14+** - Relationale Datenbank

#### Middleware & Security
- **CORS Middleware** - Cross-Origin Resource Sharing
- **Logger Middleware** - Request Logging
- **JWT (golang-jwt/jwt/v5)** - Token-basierte Authentifizierung
- **bcrypt** - Passwort-Hashing
- **Godotenv** - Environment Configuration

#### APIs & Services
- **RESTful API Design** - Standardisierte Endpunkte
- **Session Management** - UUID-basierte Sessions
- **Email Service** - Transaktionale E-Mails
- **Calendar Service** - iCal/Webcal Generation

### DevOps & Infrastructure

- **Nginx** - Reverse Proxy und Static File Server
- **SSL/TLS** - HTTPS mit Let's Encrypt
- **Systemd** - Service Management
- **Git** - Version Control

---

## 🏗️ Architektur

### System-Übersicht

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                        │
│  ┌──────────────┐   ┌──────────────┐  ┌──────────────┐      │
│  │   Browser    │   │   iOS App    │  │  Android App │      │
│  └──────┬───────┘   └──────┬───────┘  └──────┬───────┘      │
│         │                  │                 │              │
│         └──────────────────┴─────────────────┘              │
│                            │                                │
└────────────────────────────┼────────────────────────────────┘
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                      Nginx Reverse Proxy                    │
│  • SSL Termination                                          │
│  • Static File Serving                                      │
│  • Load Balancing                                           │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                 Frontend (HTML/JS/Capacitor)                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  Dashboard  │  │ Stundenplan │  │  Raumplan   │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   Navbar    │  │   Modals    │  │    Auth     │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└────────────────────────────┬────────────────────────────────┘
                             │ REST API
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Go/Fiber)                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  API Services                       │    │
│  │  • Auth Service     • Schedule Service              │    │
│  │  • User Service     • Room Service                  │    │
│  │  • Exam Service     • Friend Service                │    │
│  │  • Calendar Service • Search Service                │    │
│  └──────────────────────────┬──────────────────────────┘    │
│                             │                               │
│  ┌──────────────────────────▼──────────────────────────┐    │
│  │              Middleware Layer                       │    │
│  │  • Authentication  • Logging  • CORS                │    │
│  └──────────────────────────┬──────────────────────────┘    │
│                             │                               │
└─────────────────────────────┼───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  PostgreSQL Database                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │  Users   │  │ Sessions │  │  Events  │  │  Rooms   │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │  Exams   │  │ Friends  │  │ Zenturien│  │ Courses  │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Datenbankschema (Vereinfacht)

```sql
-- Benutzer und Authentifizierung
Users
  ├─ id (PK)
  ├─ email
  ├─ password_hash
  ├─ first_name
  ├─ last_name
  ├─ zenturie_id (FK)
  └─ subscription_uuid

Sessions
  ├─ id (PK)
  ├─ user_id (FK)
  ├─ session_id (UUID)
  └─ expires_at

-- Akademische Daten
Zenturien
  ├─ id (PK)
  ├─ name
  └─ year

Courses
  ├─ id (PK)
  ├─ module_number
  └─ name

Events
  ├─ id (PK)
  ├─ zenturie_id (FK)
  ├─ course_id (FK)
  ├─ room_id (FK)
  ├─ start_time
  ├─ end_time
  └─ professor

Exams
  ├─ id (PK)
  ├─ user_id (FK)
  ├─ course_id (FK)
  ├─ exam_date
  ├─ duration
  └─ room_id (FK)

-- Gebäude und Räume
Buildings
  ├─ id (PK)
  ├─ name
  └─ code

Rooms
  ├─ id (PK)
  ├─ building_id (FK)
  ├─ room_number
  ├─ room_name
  ├─ floor
  └─ capacity

-- Soziale Features
Friends
  ├─ id (PK)
  ├─ user_id (FK)
  └─ friend_user_id (FK)

CustomHours
  ├─ id (PK)
  ├─ user_id (FK)
  ├─ title
  ├─ start_time
  ├─ end_time
  ├─ location
  └─ location_type
```

### API-Endpunkte Übersicht

#### Authentifizierung
```
POST   /v1/register          - Benutzerregistrierung
POST   /v1/login             - Login und Session-Erstellung
POST   /v1/logout            - Session beenden
POST   /v1/reset-request     - Passwort-Reset anfordern
POST   /v1/reset-confirm     - Passwort zurücksetzen
GET    /v1/verify            - E-Mail-Verifizierung
```

#### Benutzerverwaltung
```
GET    /v1/user/profile      - Benutzerprofil abrufen
PUT    /v1/user/profile      - Profil aktualisieren
PUT    /v1/user/zenturie     - Zenturie setzen
GET    /v1/zenturien         - Alle Zenturien abrufen
```

#### Stundenplan
```
GET    /v1/schedule          - Eigene Events abrufen
GET    /v1/schedule/friend   - Friend-Schedule abrufen
POST   /v1/custom-hours      - Custom Hour erstellen
GET    /v1/custom-hours      - Custom Hours abrufen
DELETE /v1/custom-hours/:id  - Custom Hour löschen
```

#### Räume
```
GET    /v1/rooms             - Alle Räume abrufen
GET    /v1/rooms/:id         - Raumdetails abrufen
GET    /v1/rooms/free        - Freie Räume finden
```

#### Klausuren
```
GET    /v1/exams             - Eigene Klausuren abrufen
POST   /v1/exams             - Klausur erstellen
DELETE /v1/exams/:id         - Klausur löschen
```

#### Soziale Features
```
GET    /v1/friends           - Freundesliste abrufen
POST   /v1/friends           - Freund hinzufügen
DELETE /v1/friends/:id       - Freund entfernen
```

#### Suche & Kurse
```
GET    /v1/search            - Globale Suche
GET    /v1/courses           - Alle Kurse abrufen
```

#### Kalender
```
GET    /v1/calendar/subscribe/:uuid  - iCal-Feed abrufen
```

---

## 📚 API-Dokumentation

### Authentifizierung

Alle geschützten Endpunkte erfordern eine gültige Session-ID, die als Query-Parameter `session_id` oder im Body übergeben wird.

#### Session-Ablauf
1. Login mit E-Mail und Passwort
2. Backend generiert UUID-Session und speichert sie
3. Client erhält Session-ID und speichert sie im LocalStorage
4. Bei jedem Request wird Session-ID mitgesendet
5. Backend validiert Session und prüft Ablaufdatum

### Fehlerbehandlung

Alle API-Antworten folgen einem einheitlichen Schema:

**Erfolg (200 OK)**
```json
{
  "data": { ... },
  "message": "Success"
}
```

**Fehler (4xx, 5xx)**
```json
{
  "error": "Error message",
  "detail": "Detailed error description"
}
```

### Rate Limiting

Aktuell gibt es kein Rate Limiting, dies ist für zukünftige Versionen geplant.

---

## 👨‍💻 Entwickler

NORA wurde entwickelt von einem engagierten Team von Nordakademie-Studierenden:

- **[@wielauritz](https://github.com/wielauritz)** - Frontend Development, UI/UX Design
- **[@FinnK04](https://github.com/FinnK04)** - Backend Development, Database Design
- **[@aylinbmp](https://github.com/aylinbmp)** - Design, Concept
- **[@V3rkz](https://github.com/V3rkz)** - Testing

### Entwickelt während

Dieses Projekt entstand im Rahmen des **NORDAKADEMIE Hackathon 2025** und wird seitdem kontinuierlich weiterentwickelt.

---

## 🤝 Contributing

Wir freuen uns über Beiträge zur Verbesserung von NORA!

### Contribution-Prozess

1. **Fork** das Repository
2. **Erstelle** einen Feature-Branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** deine Änderungen (`git commit -m 'Add some AmazingFeature'`)
4. **Push** zum Branch (`git push origin feature/AmazingFeature`)
5. **Erstelle** einen Pull Request

### Pull Request Guidelines

- **Klare Beschreibung**: Erkläre ausführlich, was der PR macht und warum
- **Kleine, fokussierte Änderungen**: PRs sollten eine spezifische Funktion/Bugfix adressieren
- **Code-Qualität**: Halte dich an den bestehenden Code-Stil
- **Tests**: Stelle sicher, dass bestehende Funktionalität nicht beeinträchtigt wird
- **Dokumentation**: Aktualisiere die README, falls notwendig

### Review-Prozess

Alle Pull Requests werden von den Core-Entwicklern intensiv geprüft:
- **Code Review**: Überprüfung auf Qualität und Best Practices
- **Funktionstest**: Validierung der implementierten Features
- **Security Review**: Prüfung auf potenzielle Sicherheitslücken
- **Performance Check**: Analyse der Performance-Auswirkungen

**Wichtig**: Pull Requests werden nur akzeptiert, wenn sie einen echten Mehrwert bieten und den Qualitätsstandards entsprechen. Die finale Entscheidung liegt bei den Core-Entwicklern.

### Bug Reports & Feature Requests

- Nutze die **GitHub Issues** für Bug Reports und Feature Requests
- **Bug Reports** sollten enthalten:
  - Beschreibung des Problems
  - Schritte zur Reproduktion
  - Erwartetes vs. tatsächliches Verhalten
  - Screenshots (falls relevant)
  - Browser/System-Informationen
- **Feature Requests** sollten enthalten:
  - Use Case und Motivation
  - Vorgeschlagene Implementierung
  - Mögliche Alternativen

---

## 📄 Lizenz

Copyright © 2025 NORA Development Team

Dieses Projekt ist unter einer **proprietären Source-Available Lizenz** veröffentlicht.

### Zusammenfassung

✅ **Erlaubt:**
- Einsehen des Quellcodes
- Eigene Kopien für persönliche, nicht-kommerzielle Zwecke
- Beiträge über Pull Requests

❌ **Nicht erlaubt ohne schriftliche Genehmigung:**
- Kommerzielle Nutzung
- Weiterverbreitung
- Modifikation für andere Projekte
- Verwendung in anderen Produkten oder Services

Für die vollständige Lizenz siehe [LICENSE](LICENSE) Datei.

Für Anfragen bezüglich kommerzieller Nutzung oder spezieller Lizenzen, kontaktiere bitte die Core-Entwickler.

---

## 📞 Kontakt & Support

Für Fragen, Anregungen oder Support:

- **E-Mail Adresse**: [team@nora-nak.de](mailto:team@nora-nak.de)
- **GitHub Issues**: [@wielauritz/nora/issues](https://github.com/wielauritz/nora/issues)
- **Pull Requests**: [@wielauritz/nora/pulls](https://github.com/wielauritz/nora/pulls)

---

<div align="center">

**Entwickelt mit ❤️ für die NORDAKADEMIE**

[Website](https://nora-nak.de) • [GitHub](https://github.com/wielauritz/nora) • [Report Bug](https://github.com/wielauritz/nora/issues)

</div>
