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

Install
- `npm install`

Run tests
- `npm test`

Start the app
- Fallback mode (no Electron installed): `npm start`
  - Prints dashboard HTML to the console.
- Electron mode (window):
  1) `npm install --save-dev electron`
  2) `npm start` (opens window showing the dashboard)

Notes
- The app’s entry point for Electron is `electron/main.js`.
- The fallback/boot logic is in `src/boot.js`.

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
- `src/dashboard.js` dashboard model and HTML renderer
- `src/boot.js` boot logic (Electron-or-fallback)
- `scripts/start.js` Node start script
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
