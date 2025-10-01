# Electron MVP Dashboard

Minimal Electron-style project that renders a simple dashboard. It supports two modes:
- Electron mode: launches a window and displays the dashboard UI.
- Fallback mode: if Electron isn’t installed, prints the dashboard HTML to the console.

This MVP includes a small test suite using Node’s built-in test runner.

## Features
- Create and manage applications (company, role, status, notes)
- Customizable pipeline (Applied -> Interviewing -> Offer -> Hired/Rejected)
- Reminders and follow-ups with due dates
- Contacts per application (name, email, phone, LinkedIn)
- Attach links and files (job description, resume version, cover letter)
- Search, filters, and tags
- Activity timeline per application (e.g., Phone screen, On-site)
- Import/Export CSV
- Local-only by default; optional sync can be added later

## Electron Architecture
- Main process: app lifecycle, windows, file system, and database access.
- Preload script: secure bridge (IPC) between renderer and main.
- Renderer: UI (your choice, e.g., React with Vite) with no direct Node access.
- Database: SQLite stored under Electron's userData path.

Recommended defaults
- SQLite library: `better-sqlite3` (synchronous, fast) or `sqlite3`.
- Query layer (optional): Kysely, Drizzle, or Prisma.
- UI stack (optional): React + Vite or Svelte + Vite.

## Data Model (Draft)
- Application
  - id, company, position, location
  - source (Referral, LinkedIn, Company site, etc.)
  - status (Planned, Applied, Interviewing, Offer, Hired, Rejected, On Hold)
  - rating (1-5), salary_range (text)
  - application_date (date)
  - next_step (text), next_step_due (date)
  - url (posting or company page)
  - notes (markdown), tags (array)
  - attachments (paths/links)
- Contact
  - id, application_id
  - name, email, phone, title, linkedin
- Activity
  - id, application_id
  - type (Phone Screen, On-site, Take-home, Follow-up)
  - date, notes

## Local Data and Storage
- Database path: `app.getPath('userData')/app-tracker/apptracker.sqlite`.
- Attachments: store under `app.getPath('userData')/app-tracker/attachments/`.
- Backups: export CSV or a zipped backup of the database + attachments.

## Quick Start
Prerequisites
- Node.js >= 20

Install base deps
- `npm install`

Run tests
- `npm test`

Start in console (fallback)
- `npm start`
- Prints the dashboard HTML to the console (no Electron required).

Start Electron window (fallback HTML if no React build yet)
- `npm run start:electron`

Rebuild after Updates
- `npx electron-rebuild -f -w better-sqlite3`

Notes
- Electron entry: `electron/main.js` (loads `dist/index.html` if present, else fallback HTML).
- Fallback/boot logic: `src/boot.js`.

## Database (SQLite)
- Schema lives in `db/schema.sql`.
- DB helper in `src/db.js` opens a SQLite DB, applies schema, and can seed sample data.
- Default DB path in Electron: `app.getPath('userData')/apptracker.sqlite`.
- Default DB path outside Electron: `./data/apptracker.sqlite`.

Migrate and seed (requires a SQLite driver):
- Install one driver:
  - Recommended: `npm install better-sqlite3`
  - Alternative: `npm install sqlite3`
- Create schema: `npm run db:migrate`
- Seed sample data: `npm run db:seed`

## React Renderer
- Source in `renderer/` with Vite config in `vite.config.js`.
- Install UI deps:
  - `npm install react react-dom`
  - `npm install -D vite @vitejs/plugin-react`
- Dev renderer only: `npm run dev` (serves `renderer/` at http://localhost:5173)
- Build renderer: `npm run build` (outputs to `dist/`)
- Show built UI in Electron: `npm run start:electron` (loads `dist/index.html` if it exists)

Tip: For a live dev loop inside Electron, you can extend `electron/main.js` to load the Vite dev server URL when available; this MVP keeps Electron loading local `dist/` for simplicity.

## Troubleshooting
- Native module ABI mismatch (better-sqlite3)
  - Symptom: error mentions `NODE_MODULE_VERSION` mismatch when starting Electron.
  - Reason: Electron’s Node version differs from your system Node. Rebuild native module for Electron.
  - Fix:
    1) Install: `npm install -D electron-rebuild`
    2) Rebuild for Electron: `npm run rebuild:electron`
    3) If needed, rebuild for Node for CLI scripts: `npm run rebuild:node`
  - Manual alternative: `npx electron-rebuild -f -w better-sqlite3`

Suggested scripts (add later to package.json)
```json
{
  "main": "electron/main.js",
  "scripts": {
    "dev": "concurrently -k \"vite\" \"wait-on http://localhost:5173 && electron .\"",
    "build": "vite build",
    "dist": "electron-builder --dir",
    "release": "electron-builder"
  }
}
```

Minimal electron-builder config (package.json)
```json
{
  "build": {
    "appId": "com.yourname.apptracker",
    "productName": "Application Tracker",
    "files": ["dist/**", "electron/**", "preload/**", "package.json"],
    "extraMetadata": { "main": "electron/main.js" },
    "directories": { "output": "release" },
    "asar": true,
    "win": { "target": ["nsis", "portable"] },
    "mac": { "target": ["dmg"], "category": "public.app-category.productivity" },
    "linux": { "target": ["AppImage"], "category": "Utility" }
  }
}
```

## Security Best Practices
- Disable Node integration in the renderer: `nodeIntegration: false`.
- Enable context isolation: `contextIsolation: true`.
- Use a strict Content Security Policy (CSP) in `index.html`.
- Only expose safe APIs in `preload` via `contextBridge.exposeInMainWorld`.
- Validate and sanitize any IPC inputs on the main process.
- Never store secrets in the renderer or bundle.

## Usage
- Add an application with company, role, and link
- Update status and log activities after each interview step
- Set a reminder on `next_step_due` and check the Upcoming view daily
- Filter by status or tag (e.g., "Dream Companies")
- Export CSV weekly for backups

## Packaging
This MVP does not include packaging scripts yet. See the suggested `electron-builder` configuration below if you plan to add packaging later.

## Project Structure (Proposed)
- `electron/` main process (window + dashboard render)
- `preload/` IPC bridge for safe APIs (e.g., `get-stats`)
- `src/dashboard.js` dashboard model and HTML renderer
- `src/boot.js` boot logic (Electron-or-fallback)
- `src/db.js` SQLite helper (open, migrate, seed, stats)
- `scripts/start.js` Node start script
- `scripts/migrate.js`, `scripts/seed.js` DB scripts
- `test/` tests for dashboard and boot fallback

## Roadmap
- Calendar view for upcoming follow-ups
- OS notifications for reminders
- Kanban pipeline view
- Resume/Cover letter version tracking per application
- Optional encrypted sync across devices
- Import from LinkedIn/CSV templates

## Contributing
- Issues and PRs are welcome. Please discuss larger features first.
- Prefer conventional commits (e.g., `feat:`, `fix:`).

## License
Choose a license (MIT recommended for open source). Until chosen, all rights reserved by default.

## Naming
This document uses "Application Tracker" as a placeholder. Rename across the repo once you decide your product name.
