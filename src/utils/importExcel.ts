import type ExcelJS from 'exceljs'
import {
  DAYS,
  SUBJECT_COLORS,
  type AppState,
  type Period,
  type ScheduleEntry,
  type Subject,
  type Teacher,
} from '../types'

export interface ImportResult {
  state: AppState
  summary: string
  warnings: string[]
}

const TIME_RANGE = /^(\d{1,2})[.:](\d{2})\s*[-–]\s*(\d{1,2})[.:](\d{2})$/
const CODE_PATTERN = /^[A-Za-z0-9]{1,6}$/

/** Ambil teks sebuah sel apa pun bentuk value-nya (richText, formula, dll). */
function cellText(ws: ExcelJS.Worksheet, row: number, col: number): string {
  const value = ws.getRow(row).getCell(col).value
  if (value == null) return ''
  if (typeof value === 'object') {
    if ('richText' in value) return value.richText.map((t) => t.text).join('').trim()
    if ('result' in value) return String(value.result ?? '').trim()
    if ('text' in value) return String(value.text).trim()
  }
  return String(value).trim()
}

function normalizeTime(h: string, m: string): string {
  return `${h.padStart(2, '0')}:${m}`
}

const DAY_INDEX = new Map(DAYS.map((d, i) => [d.toUpperCase(), i]))

/**
 * Baca workbook berformat jadwal sekolah: satu sheet, hari tersusun vertikal,
 * kolom = kelas, isi sel = kode guru, legenda "KODE GURU" (kode|nama|mapel)
 * di sisi kanan. Ini format yang sama dengan hasil Export Excel aplikasi ini.
 */
export function parseScheduleWorkbook(wb: ExcelJS.Workbook): ImportResult {
  const ws = wb.worksheets[0]
  if (!ws) throw new Error('Workbook tidak punya sheet.')
  const warnings: string[] = []

  // --- Cari baris header (mengandung HARI dan WAKTU) ---
  let headerRow = -1
  let hariCol = -1
  let waktuCol = -1
  for (let r = 1; r <= Math.min(ws.rowCount, 30) && headerRow === -1; r++) {
    for (let c = 1; c <= ws.columnCount; c++) {
      const t = cellText(ws, r, c).toUpperCase()
      if (t === 'HARI') {
        hariCol = c
      } else if (t === 'WAKTU' && hariCol !== -1) {
        headerRow = r
        waktuCol = c
        break
      }
    }
  }
  if (headerRow === -1) {
    throw new Error('Header "HARI"/"WAKTU" tidak ditemukan. Pastikan formatnya sesuai.')
  }

  // --- Cari legenda KODE GURU ---
  let legendRow = -1
  let legendCol = -1
  for (let r = 1; r <= ws.rowCount && legendRow === -1; r++) {
    for (let c = waktuCol + 1; c <= ws.columnCount; c++) {
      if (/^KODE\s*GURU$/i.test(cellText(ws, r, c))) {
        legendRow = r
        legendCol = c
        break
      }
    }
  }

  // --- Baris data pertama = baris pertama setelah header yang kolom WAKTU-nya berupa rentang jam ---
  let dataStart = -1
  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    if (TIME_RANGE.test(cellText(ws, r, waktuCol))) {
      dataStart = r
      break
    }
  }
  if (dataStart === -1) throw new Error('Tidak ada baris jadwal (kolom WAKTU kosong semua).')

  // --- Legenda: kode -> guru + mapel ---
  const teachers: Teacher[] = []
  const teacherByCode = new Map<string, Teacher>()
  const subjects: Subject[] = []
  const subjectByName = new Map<string, Subject>()
  const subjectOfTeacher = new Map<string, Subject>()
  let colorIdx = 0

  function getSubject(name: string): Subject {
    const existing = subjectByName.get(name.toUpperCase())
    if (existing) return existing
    const subject: Subject = {
      id: crypto.randomUUID(),
      name,
      color: SUBJECT_COLORS[colorIdx++ % SUBJECT_COLORS.length],
    }
    subjects.push(subject)
    subjectByName.set(name.toUpperCase(), subject)
    return subject
  }

  if (legendRow !== -1) {
    let lastName = ''
    let lastPrefix = ''
    for (let r = legendRow + 1; r <= ws.rowCount; r++) {
      const code = cellText(ws, r, legendCol)
      if (!CODE_PATTERN.test(code)) continue
      const rawName = cellText(ws, r, legendCol + 1)
      const subjectName = cellText(ws, r, legendCol + 2)
      if (rawName === '' && subjectName === '') continue
      const prefix = code.replace(/[a-z]+$/i, '')
      // Nama kosong = guru yang sama dengan kode ber-prefix sama di baris sebelumnya.
      const name =
        rawName !== '' ? rawName : prefix === lastPrefix && lastName !== '' ? lastName : `Guru ${code}`
      const teacher: Teacher = { id: crypto.randomUUID(), name, code }
      teachers.push(teacher)
      teacherByCode.set(code.toUpperCase(), teacher)
      if (subjectName !== '') subjectOfTeacher.set(teacher.id, getSubject(subjectName))
      lastName = name
      lastPrefix = prefix
    }
  } else {
    warnings.push('Legenda "KODE GURU" tidak ditemukan — semua isi sel dianggap kegiatan tanpa guru.')
  }

  // --- Kolom kelas: antara WAKTU dan legenda, dengan nama di baris header ---
  const lastClassCol = legendCol === -1 ? ws.columnCount : legendCol - 1
  const classCols: number[] = []
  const classNames: string[] = []
  for (let c = waktuCol + 1; c <= lastClassCol; c++) {
    const parts: string[] = []
    for (let r = headerRow; r < dataStart; r++) {
      const t = cellText(ws, r, c)
      if (t === '' || /^KELAS$/i.test(t) || /^KODE\s*GURU$/i.test(t)) continue
      if (parts[parts.length - 1] !== t) parts.push(t)
    }
    const name = parts.join(' ').trim()
    if (name !== '') {
      classCols.push(c)
      classNames.push(name)
    }
  }
  if (classCols.length === 0) throw new Error('Tidak ada kolom kelas yang terbaca di header.')
  const classes = classNames.map((name) => ({ id: crypto.randomUUID(), name }))

  // --- Baca baris jadwal ---
  interface RawRow {
    day: number
    start: string
    end: string
    cells: string[]
  }
  const rawRows: Array<Omit<RawRow, 'day'> & { day: number | null }> = []
  for (let r = dataStart; r <= ws.rowCount; r++) {
    const m = TIME_RANGE.exec(cellText(ws, r, waktuCol))
    if (!m) continue
    const hari = cellText(ws, r, hariCol).toUpperCase()
    const day = DAY_INDEX.get(hari) ?? null
    if (hari !== '' && day === null) {
      warnings.push(`Hari "${hari}" tidak dikenali — barisnya dilewati.`)
      continue
    }
    rawRows.push({
      day,
      start: normalizeTime(m[1], m[2]),
      end: normalizeTime(m[3], m[4]),
      cells: classCols.map((c) => cellText(ws, r, c)),
    })
  }
  // Baris tanpa HARI (mis. slot "0" Upacara/Literasi sebelum jam pertama, atau
  // sel merge) diisi dari baris terdekat: mundur dulu, sisanya maju.
  for (let i = rawRows.length - 2; i >= 0; i--) {
    if (rawRows[i].day === null) rawRows[i].day = rawRows[i + 1].day
  }
  for (let i = 1; i < rawRows.length; i++) {
    if (rawRows[i].day === null) rawRows[i].day = rawRows[i - 1].day
  }

  // --- Susun periods + entries ---
  const daySchedules: Period[][] = DAYS.map(() => [])
  const entries: ScheduleEntry[] = []
  const unknownCells = new Map<string, number>()

  for (const row of rawRows) {
    if (row.day === null) continue
    const day = row.day
    const nonEmpty = [...new Set(row.cells.filter((t) => t !== ''))]
    const isActivityRow =
      nonEmpty.length === 1 &&
      row.cells.every((t) => t !== '') &&
      !teacherByCode.has(nonEmpty[0].toUpperCase())

    const period: Period = {
      id: `d${day}-${daySchedules[day].length + 1}`,
      start: row.start,
      end: row.end,
      label: isActivityRow ? nonEmpty[0] : null,
    }
    daySchedules[day].push(period)
    if (isActivityRow) continue

    row.cells.forEach((text, i) => {
      if (text === '') return
      const teacher = teacherByCode.get(text.toUpperCase())
      if (teacher) {
        const subject = subjectOfTeacher.get(teacher.id) ?? getSubject(`Mapel ${teacher.code}`)
        entries.push({
          id: crypto.randomUUID(),
          day,
          periodId: period.id,
          classId: classes[i].id,
          subjectId: subject.id,
          teacherId: teacher.id,
        })
      } else {
        // Bukan kode guru (mis. "P5BK"): jadikan kegiatan kelas tanpa guru.
        entries.push({
          id: crypto.randomUUID(),
          day,
          periodId: period.id,
          classId: classes[i].id,
          subjectId: getSubject(text).id,
          teacherId: null,
        })
        unknownCells.set(text, (unknownCells.get(text) ?? 0) + 1)
      }
    })
  }

  for (const [text, count] of unknownCells) {
    warnings.push(`"${text}" (${count} sel) bukan kode guru — diimpor sebagai kegiatan tanpa guru.`)
  }

  const state: AppState = {
    version: 2,
    teachers,
    subjects,
    classes,
    daySchedules,
    entries,
  }

  const summary =
    `${classes.length} kelas, ${teachers.length} guru, ${subjects.length} mapel, ` +
    `${entries.length} entri jadwal dari sheet "${ws.name}"`

  return { state, summary, warnings }
}

export async function importFromExcelFile(file: File): Promise<ImportResult> {
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())
  return parseScheduleWorkbook(wb)
}
