---
name: verify
description: Build, launch, and drive the class-schedule-organizer app (Vite + React + Bun) to verify changes end-to-end in a real browser.
---

# Verifying class-schedule-organizer

Static React SPA, no backend. All state lives in `localStorage` under
`class-schedule-organizer:v2` (v1 key is auto-migrated on load — worth
re-testing when the schema changes).

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
5. "Export Excel" → wait for `download` event, save, re-read with `exceljs` (already a dependency). Format: SATU sheet gaya jadwal sekolah — judul, header 3 baris (HARI|JAM KE-|WAKTU|KELAS...), hari tersusun vertikal (HARI di-merge per blok), waktu "07.40-08.20" (titik), isi sel = kode guru (atau nama mapel untuk entri tanpa guru, mis. P5BK), legenda "KODE GURU" (kode|nama|mapel) di kolom kanan.
5b. "Import Excel" (hidden `input[type=file]`, pakai `setInputFiles`) membaca format yang sama — uji dengan file asli `JADWAL PELAJARAN 2425.xlsx` di root repo dan dengan hasil export (round-trip: jumlah kelas/guru/entri harus sama). Konfirmasi import memakai `confirm()` berisi ringkasan; file tak valid → `alert()` tanpa mengubah data.
6. Print: `page.emulateMedia({ media: 'print' })` + screenshot — only `.print-title` + grid should be visible (`.no-print` hidden).

## Gotchas

- `confirm()`/native dialogs are used for deletes and period changes — register `page.once('dialog', …)` **before** clicking.
- Seed data uses fixed ids (`t-af`, `s-ipa`, `c-7a`; periods per hari: `sen-1`…`sen-10`, `sel-*`, `rab-*`, `kam-*`, `jum-1`…`jum-8`), handy for selecting options by value in tests.
- Tiap hari punya susunan jam sendiri (`state.daySchedules[day]`). Grid = 5 kolom `.day-col`; slot mapel = `.slot.lesson` (clickable), slot kegiatan (Upacara/Istirahat/Solat Jumat) = `.slot.activity` (tidak clickable). Senin default diawali Upacara, Jumat lebih pendek + Solat Jumat.
- Penomoran "jam ke-" dihitung per hari dan melompati slot kegiatan — jam ke-1 Senin default mulai 07:45, bukan 07:00.
- Pengaturan jam di Data Master pakai tab per hari (`.day-tab`) + tombol "Salin" antar hari; simpan memakai satu tombol "Simpan Jam Pelajaran" untuk seluruh minggu.
- Entri boleh tanpa guru (`teacherId: null`, mis. P5BK) — tidak ikut deteksi bentrok dan tidak muncul di tampilan per-guru.
- Di legenda KODE GURU, baris dengan nama kosong mewarisi nama dari kode ber-prefix angka sama sebelumnya (3b ← 3a).
