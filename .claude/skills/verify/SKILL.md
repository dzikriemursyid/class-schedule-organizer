---
name: verify
description: Build, launch, and drive the class-schedule-organizer app (Vite + React + Bun) to verify changes end-to-end in a real browser.
---

# Verifying class-schedule-organizer

Static React SPA, no backend. All state lives in `localStorage` under
`class-schedule-organizer:v3` (v1 & v2 keys are auto-migrated on load —
worth re-testing when the schema changes). v3 adds `assignments`
(penugasan mengajar), optional `Teacher.code`/`maxPerDay`/`unavailable`,
and `Subject.maxJpPerWeek`/`classIds`/`distribution`/`timePreference`.

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
5b. "Import Excel" (hidden `input[type=file]`, pakai `setInputFiles`) membaca format yang sama — legenda guru mendukung DUA bentuk header: satu sel merge `KODE GURU`, atau tiga sel `Kode | Nama Guru | Mata Pelajaran`. Uji dengan file contoh user (`JADWAL PELAJARAN 2425.xlsx` = terisi; `JADWAL PELAJARAN 2627.xlsx` = sel jadwal SENGAJA kosong untuk menyiapkan struktur lalu dialokasikan). File kosong → 0 entri tapi kelas/guru/mapel/kegiatan (Upacara/Pembiasaan Pagi/Istirahat) tetap terbaca. Import switch ke tab `class` (tunggu `.day-columns`, bukan overview). Konfirmasi pakai `confirm()`; file tak valid → `alert()` tanpa mengubah data. (File contoh berisi nama guru asli → tidak di-commit; ambil dari Documents/Downloads user.)
6. Print: `page.emulateMedia({ media: 'print' })` + screenshot — only `.print-title` + grid should be visible (`.no-print` hidden).
7. Tab "Keseluruhan" (`.overview-grid`, default tab): semua kelas jadi kolom, hari ditumpuk vertikal; sel `td.cell` clickable → EntryDialog. Edit di sini langsung sinkron ke tab per Kelas/per Guru (satu state reducer).
8. Tab "Alokasi Otomatis": editor penugasan (`.assign-table`), tombol "Jalankan Alokasi" → dialog mode (`.mode-options`: Isi slot kosong / Timpa semua) → panel hasil (`.result-panel`) → "Terapkan ke Jadwal" (dispatch APPLY_ALLOCATION). Solver di `src/utils/allocate.ts` (murni) — assert `findConflicts` = 0, mapel `pagi` (PJOK) hanya di jam awal, mapel `blok` (Informatika) kontigu, `unavailable`/`maxPerDay` dipatuhi. Mode fill mempertahankan entri manual.
9. Tab per Guru kini editable: klik sel kosong → `.class-picker` (pilih kelas) → EntryDialog dengan guru ter-prefill (`defaultTeacherId`).

## Gotchas

- `confirm()`/native dialogs are used for deletes and period changes — register `page.once('dialog', …)` **before** clicking.
- Seed data uses fixed ids (`t-af`, `s-ipa`, `c-7a`; periods per hari: `sen-1`…`sen-10`, `sel-*`, `rab-*`, `kam-*`, `jum-1`…`jum-8`), handy for selecting options by value in tests.
- Tiap hari punya susunan jam sendiri (`state.daySchedules[day]`). Grid = 5 kolom `.day-col`; slot mapel = `.slot.lesson` (clickable), slot kegiatan (Upacara/Istirahat/Solat Jumat) = `.slot.activity` (tidak clickable). Senin default diawali Upacara, Jumat lebih pendek + Solat Jumat.
- Penomoran "jam ke-" dihitung per hari dan melompati slot kegiatan — jam ke-1 Senin default mulai 07:45, bukan 07:00.
- Pengaturan jam di Data Master pakai tab per hari (`.day-tab`) + tombol "Salin" antar hari; simpan memakai satu tombol "Simpan Jam Pelajaran" untuk seluruh minggu.
- Entri boleh tanpa guru (`teacherId: null`, mis. P5BK) — tidak ikut deteksi bentrok dan tidak muncul di tampilan per-guru.
- Di legenda KODE GURU, baris dengan nama kosong mewarisi nama dari kode ber-prefix angka sama sebelumnya (3b ← 3a).
