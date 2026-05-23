# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # dev server at http://localhost:3000
npm run build      # production build → build/
npm test           # run tests (watch mode); press a to run all
npm test -- --testPathPattern=<file>  # single test file
```

**PowerShell workaround** — if `npm` is blocked by execution policy:
```powershell
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" <command>
```

ESLint runs automatically via react-scripts; no separate lint command.

## Tech Constraints

- **Tailwind CSS v3** (devDependency). Do NOT upgrade to v4 — it is incompatible with CRA / react-scripts 5.
- **Create React App v5** (react-scripts 5.0.1). No Next.js, no Vite.
- **Kakao Maps SDK** loaded via `<script>` tag in `public/index.html`; not an npm package.
- **No routing library** — navigation is a `page` string in `useState`.

## Architecture

### State and Routing

`App.js` is the single source of truth. It owns:
- `page` — current view (`'home' | 'timetable' | 'map' | 'portfolio' | 'memo'`)
- `classes` — timetable entries, persisted to `dju_classes` in localStorage
- `notifPerm` — browser notification permission state (`'default' | 'granted' | 'denied'`)
- `notifBanner` — whether to show the permission-denied banner

`renderPage()` is a switch statement; there is no React Router. Sidebar and BottomTabBar each call `onChange(key)` to set `page`. The `memo` page is only reachable via the floating button (top-right `fixed`); it does not appear in Sidebar or BottomTabBar nav items.

### Data Flow

`classes` is the only state lifted to `App.js`. It is passed as props to `Home`, `Timetable`, and `CampusMap`. `memos` (key: `dju_memos`) is **not** lifted — `Memo.jsx` manages it locally and `Home.jsx`'s `AlertsCard` reads it directly from localStorage on each render.

```
App.js
  classes ──► Home.jsx        (today's classes card, alerts card, map preview)
  classes ──► Timetable.jsx   (weekly grid, add/edit/delete)
  classes ──► CampusMap.jsx   (auto-select next class building as destination)

localStorage
  dju_classes    ← written by App.js useEffect
  dju_memos      ← written by Memo.jsx, read directly by Home.jsx AlertsCard
  dju_portfolio  ← written and read only by Portfolio.jsx
  dju_userName   ← read by App.js (no setter UI yet)
  dju_userDept   ← read by App.js (no setter UI yet)
```

### Notification Architecture

All **class** notifications (10 min before start) are scheduled in `App.js` in a `useEffect([classes, notifPerm])`. Timers are cleared on re-run (cleanup). Only same-day classes are scheduled; there is no midnight refresh — the user must reload the page each day to reschedule.

**Memo deadline reminders** are scheduled inside `Memo.jsx` in a separate `useEffect([memos, notifPerm])` using per-reminder `firedReminders[]` to prevent duplicate fires.

Permission is requested at app mount in `App.js`. `Memo.jsx` also calls `requestPermission()` lazily when saving a memo with reminders.

### Kakao Maps Pattern

`CampusMap.jsx` stores all Kakao instances in a single `K = useRef({})` object:
```
K.current = { map, myOverlay, destMarker, routeLine, openIw, watchId, notifSent }
```
The map SDK is not immediately available — the component polls `window.kakao?.maps` every 200ms (up to 10s). The InfoWindow "목적지 설정" button calls `window.__mapSetDest(id)`, a global registered in a separate `useEffect` that bridges the Kakao DOM context back to React's `setDest`.

**ESLint rule**: always capture `K.current` into a local variable before the `useEffect` cleanup return — using `K.current` directly in cleanup causes a `react-hooks/exhaustive-deps` warning.

### Timetable Data Shape

```js
{
  id: Date.now(),       // number
  name: string,
  building: string,
  room: string,
  location: string,
  days: string[],       // e.g. ['월', '수']
  start: number,        // integer hour, e.g. 9
  end: number,          // integer hour, e.g. 11
  colorIdx: number,     // index into COLORS array
}
```

`start` and `end` are stored and compared as plain integers (hours), not "HH:MM" strings.

### Design Tokens

- Custom color `navy: '#1F3864'` (defined in `tailwind.config.js`)
- Page background: `bg-[#F5F7FA]`
- Cards: `bg-white rounded-2xl shadow-sm`
- Modals: bottom-sheet on mobile (`items-end rounded-t-3xl`), centered on desktop (`sm:items-center sm:rounded-2xl`)

### Unused File

`src/components/MemoModal.jsx` is a legacy component superseded by `src/pages/Memo.jsx`. It is not imported anywhere and can be deleted.
