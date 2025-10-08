# Bewerbungs-Cockpit

Verwalte deine Bewerbungen lokal, schnell und sicher:
- Bewerbungen mit Status, Notizen und Links anlegen
- Kontakte pro Bewerbung verwalten; Aktivitäten erfassen
- React-Oberfläche (Vite) + Electron-Shell; JSON-Datei als Datenspeicher

## Schnellstart
```
npm install
npm test               # Node.js Tests ausführen

# App starten
npm run start:electron # Öffnet das Electron-Fenster (falls Electron installiert ist)
npm start              # Startet die App; mit Electron -> Fenster, sonst HTML in Konsole

# Renderer (React) im Dev-Modus
npm run dev            # Vite-Dev-Server für die Renderer-UI
```
Hinweis: Um den Konsolen‑Fallback explizit zu erzwingen, kannst du folgendes ausführen:
`node -e "require('./src/boot').boot({forceFallback:true})"`.

## Build
- `npm run build:renderer` – baut den React‑Renderer nach `dist/`.
- `npm run build` – baut Renderer und paketiert die Electron‑App (Ausgabe unter `release/`).

## Daten & Persistenz
- Treiber: JSON-Datei (kein SQLite).
- Standardpfad: `./data/apptracker.json`.
- Unter Electron: Speicherung im `userData`‑Verzeichnis der App (z. B. `%APPDATA%/...`).
- Initialisieren/Seed:
  - `npm run db:migrate` – legt die JSON‑Datei (falls nötig) an.
  - `npm run db:seed` – füllt Beispieldaten ein.

## Architektur
- `electron/main.js` – Fenster, IPC, DB‑Zugriff, Fallback‑HTML wenn kein Build vorhanden ist
- `preload/index.js` – sichere Bridge (keine Node‑APIs im Renderer)
- `renderer/` – React‑UI (Vite)
- `src/boot.js` – Startlogik; startet Electron oder fällt auf HTML‑Ausgabe zurück
- `src/dashboard.js` – kleines Dashboard als reine HTML‑Ausgabe (Fallback)
- `src/db.js` – leichtgewichtiger JSON‑Store inkl. Seeds
- `scripts/` – Start, Migration/Seed

## Hinweise
- Keine nativen Module – einfache Installation, keine zusätzliche Toolchain notwendig.
- Daten bleiben lokal – ideal für Bewerbungs‑Tracking ohne Cloud.
- Die Datei `db/schema.sql` ist aktuell nur historisch und wird nicht verwendet (JSON‑Speicher aktiv).

