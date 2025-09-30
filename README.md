# Application Tracker

Track all your job applications to different businesses in one place. Log details, set follow‑ups, and keep momentum during your job search.

## Features
- Add and manage applications (company, role, status, notes)
- Customizable statuses and pipelines (Applied → Interviewing → Offer → Hired/Rejection)
- Reminders and follow‑ups with due dates
- Contacts per application (name, email, phone, LinkedIn)
- Attach links and files (JD, resume version, cover letter)
- Search, filters, and tags
- Activity timeline per application (e.g., “Phone screen”, “On‑site”)
- Import/Export CSV
- Privacy‑first: local storage by default, optional sync later

## Data Model (Draft)
- Application
  - `id`
  - `company`
  - `position`
  - `location`
  - `source` (Referral, LinkedIn, Company site, etc.)
  - `status` (Planned, Applied, Interviewing, Offer, Hired, Rejected, On Hold)
  - `rating` (1–5)
  - `salary_range` (text)
  - `application_date` (date)
  - `next_step` (text)
  - `next_step_due` (date)
  - `url` (posting or company page)
  - `notes` (markdown)
  - `tags` (array)
  - `attachments` (paths/links)
- Contact
  - `id`, `application_id`
  - `name`, `email`, `phone`, `title`, `linkedin`
- Activity
  - `id`, `application_id`
  - `type` (e.g., Phone Screen, On‑site, Take‑home, Follow‑up)
  - `date`, `notes`

## Getting Started
This README is stack‑agnostic so you can pick your preferred technologies. Suggested defaults:
- Backend: Node.js (Express/Fastify) or Python (FastAPI)
- Database: SQLite for local, PostgreSQL for sync/multi‑device
- Frontend: React (Vite) or Next.js
- Desktop app (optional): Electron or Tauri

### Local Setup (Template)
1. Clone the repo
   - `git clone <your-repo-url>`
   - `cd <your-project-folder>`
2. Configure environment
   - Copy: `cp .env.example .env` (or create `.env`)
   - Set database path, port, and any API keys if needed
3. Install dependencies
   - `npm install` (or `pnpm i` / `pip install -r requirements.txt`)
4. Run in development
   - `npm run dev` (or `uvicorn app:app --reload`)
5. Open the app
   - Web: `http://localhost:3000` (or printed URL)
   - Desktop: start the Electron/Tauri dev task

## Usage
- Add an application with company, role, and link
- Update status and log activities after each interview step
- Set a reminder on `next_step_due` and check “Upcoming” view daily
- Filter by status or tag (e.g., “Dream Companies”)
- Export CSV weekly for backup or sharing

## Roadmap
- Calendar view for upcoming follow‑ups
- Email/Calendar integration (Gmail/Outlook) for automated reminders
- Resume/Cover letter version tracking per application
- Kanban pipeline view
- Mobile‑friendly PWA
- End‑to‑end encryption for sync

## Project Structure (To Be Finalized)
- `apps/` or `packages/` (mono‑repo friendly)
- `api/` for backend services
- `web/` for frontend
- `desktop/` for Electron/Tauri wrapper

## Contributing
- Issues and PRs are welcome. Please open an issue to discuss larger features.
- Use conventional commits if possible (e.g., `feat:`, `fix:`).

## License
Choose a license for your project (e.g., MIT, Apache‑2.0). You can decide later—until then, all rights reserved by default.

## Naming
This document uses “Application Tracker” as a placeholder. Feel free to rename throughout once you pick your product name.

---
Need help tailoring this README to your chosen stack or naming? Open an issue or update the sections above and we’ll refine further.
