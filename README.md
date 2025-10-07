# Bewerbungs-Cockpit

Verwalte deine Bewerbungen lokal, schnell und sicher:
- Bewerbungen mit Status, Notizen und Links anlegen
- Kontakte & Aktivitaeten pro Bewerbung pflegen
- React-Oberflaeche (Vite) + Electron-Shell, JSON-Datei als Datenspeicher

## Schnellstart
```
npm install
npm test            # Check
npm run build       # Renderer bauen
npm run start:electron
```
Ohne Electron: `npm start` druckt das Dashboard als HTML in die Konsole.

## Architektur
- `electron/main.js` – Fenster, IPC, DB-Zugriff
- `preload/index.js` – sichere Bridge (keine Node-APIs im Renderer)
- `renderer/` – React UI
- `src/db.js` – leichtgewichtiger JSON-Store inkl. Seeds
- Datenpfad: `./data/apptracker.json` (Electron: `userData`)

## Hinweise
- Keine nativen Module – keine Build-Toolchain erforderlich.
- Daten bleiben lokal – ideal fuer Bewerbungs-Tracking ohne Cloud.
