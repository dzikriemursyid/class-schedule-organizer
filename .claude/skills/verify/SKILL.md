---
name: verify
description: Build, launch, and drive the class-schedule-organizer app (Vite + React + Bun) to verify changes end-to-end in a real browser.
---

# Verifying class-schedule-organizer

Static React SPA, no backend. All state lives in `localStorage` under
`class-schedule-organizer:v1`.

## Build & launch

```bash
bun run build        # tsc -b && vite build — must pass
bun run lint         # eslint .
bun run dev          # dev server on http://localhost:5173 (run in background)
```

## Drive (browser)

No Playwright browsers installed; use `playwright-core` with the system
Chrome instead (no download):

```bash
cd <scratchpad> && bun add playwright-core
# then: chromium.launch({ channel: 'chrome', headless: true })
```

Flows worth driving:

1. Fresh load → empty state → tombol "Muat Data Contoh" seeds teachers/subjects/classes/entries.
2. Tab "Jadwal per Kelas" → click a cell → EntryDialog: pick mapel + guru; picking a teacher already teaching another class at that slot shows a ⚠ warning; saving creates a conflict → banner appears, chip gets red outline.
3. Banner "Lihat jadwal guru" → jumps to teacher tab with that teacher selected.
4. Reload page → data persists (localStorage).
5. "Export Excel" → wait for `download` event, save, re-read with `exceljs` (already a dependency) to assert sheet names ("Kelas 7A", "Guru AF …"), header row, and cell fills.
6. Print: `page.emulateMedia({ media: 'print' })` + screenshot — only `.print-title` + grid should be visible (`.no-print` hidden).

## Gotchas

- `confirm()`/native dialogs are used for deletes and period changes — register `page.once('dialog', …)` **before** clicking.
- Seed data uses fixed ids (`t-af`, `s-ipa`, `c-7a`, periods `p1`…`p10`), handy for selecting options by value in tests.
- Break rows (`.break-row`) are not clickable cells; lesson rows have 5 `td.cell` each.
