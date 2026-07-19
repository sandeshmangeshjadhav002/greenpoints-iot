# EcoLoop — Smart Waste Management & Reward Token System (Frontend)

A frontend-only React (Vite) + Tailwind CSS application for a smart waste
management and reward-token platform. No backend, database, auth, or API
calls are included — everything runs on realistic dummy data so it's easy
to preview and later wire up to a real Node.js backend and ESP32 hardware.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL (usually `http://localhost:5173`).

To build for production:

```bash
npm run build
npm run preview
```

## Tech stack

- **React 18** + **Vite** — app shell and dev server
- **React Router v6** — client-side routing across 10 pages
- **Tailwind CSS** — utility-first styling, dark mode via `class` strategy
- **Recharts** — all charts (area, bar, line, pie)
- **lucide-react** — icon set

## Folder structure

```
src/
├── assets/          static assets (currently images are remote/CDN)
├── components/       reusable UI building blocks (Card, Button, Table, Modal, ...)
├── context/          ThemeContext (dark/light mode)
├── data/              dummy data (users, bins, rewards, notifications, analytics, ...)
├── hooks/             useCountUp, useInView
├── layouts/           MainLayout (public pages), DashboardLayout (app pages)
├── pages/             Landing, Dashboard, SmartBins, Rewards, Leaderboard,
│                      Analytics, Notifications, Profile, About, Contact
├── utils/             helpers.js (class name + color helpers)
├── App.jsx            route table
├── main.jsx           entry point
└── index.css          Tailwind layers + glassmorphism/utility classes
```

## Notes for backend integration

- All dummy data lives in `src/data/*.js` — replace these with API calls
  (e.g. React Query / fetch) when a Node.js backend is available.
- `src/pages/SmartBins.jsx` and its `bins` data model are shaped to match
  typical ESP32 sensor payloads (fill level, battery, wifi, sensor status).
- No tokens are actually deducted anywhere (Rewards page) and the contact
  form doesn't send anything — both are marked as UI-only in the code.
