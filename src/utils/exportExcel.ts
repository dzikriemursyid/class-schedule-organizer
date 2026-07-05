import type ExcelJS from 'exceljs'
import { DAYS, lessonNumbers, type AppState } from '../types'

const HEADER_FILL = 'FF1E3A5F'
const ACTIVITY_FILL = 'FFE2E8F0'
const BORDER = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
} satisfies Partial<ExcelJS.Borders>

function toArgb(hex: string): string {
  return `FF${hex.replace('#', '').toUpperCase()}`
}

/** Format waktu mengikuti kebiasaan jadwal sekolah: "07.40-08.20". */
function timeRange(start: string, end: string): string {
  return `${start.replace(':', '.')}-${end.replace(':', '.')}`
}

/**
 * Layout satu sheet untuk seluruh sekolah:
 * baris = hari (tersusun vertikal), kolom = kelas, isi sel = kode guru,
 * plus legenda "KODE GURU" (kode | nama | mapel) di sisi kanan.
 * Format ini juga yang dibaca kembali oleh importExcel.
 */
export async function exportToExcel(state: AppState) {
  // Dynamic import supaya exceljs (~940 kB) tidak masuk bundle awal.
  const { default: ExcelJS } = await import('exceljs')
  const subjectsById = new Map(state.subjects.map((s) => [s.id, s]))
  const teachersById = new Map(state.teachers.map((t) => [t.id, t]))

  const wb = new ExcelJS.Workbook()
  wb.created = new Date()
  const ws = wb.addWorksheet('Jadwal Pelajaran')

  const numClasses = state.classes.length
  const firstClassCol = 4 // A=HARI, B=JAM KE-, C=WAKTU
  const legendCol = firstClassCol + numClasses + 1 // satu kolom kosong sebagai pemisah
  ws.columns = [
    { width: 10 },
    { width: 8 },
    { width: 13 },
    ...state.classes.map(() => ({ width: 11 })),
    { width: 3 },
    { width: 8 },
    { width: 28 },
    { width: 34 },
  ]

  // Judul
  ws.mergeCells(1, 1, 1, firstClassCol + numClasses - 1)
  const title = ws.getCell(1, 1)
  title.value = 'JADWAL PELAJARAN'
  title.font = { bold: true, size: 14 }
  title.alignment = { horizontal: 'center' }

  // Header (baris 3-5): HARI | JAM KE- | WAKTU | KELAS... + KODE GURU
  const headerRow = 3
  const dataStart = headerRow + 3
  ws.mergeCells(headerRow, 1, headerRow + 2, 1)
  ws.mergeCells(headerRow, 2, headerRow + 2, 2)
  ws.mergeCells(headerRow, 3, headerRow + 2, 3)
  ws.getCell(headerRow, 1).value = 'HARI'
  ws.getCell(headerRow, 2).value = 'JAM KE-'
  ws.getCell(headerRow, 3).value = 'WAKTU'
  if (numClasses > 0) {
    ws.mergeCells(headerRow, firstClassCol, headerRow, firstClassCol + numClasses - 1)
    ws.getCell(headerRow, firstClassCol).value = 'KELAS'
  }
  state.classes.forEach((cls, i) => {
    const col = firstClassCol + i
    ws.mergeCells(headerRow + 1, col, headerRow + 2, col)
    ws.getCell(headerRow + 1, col).value = cls.name
  })
  for (let c = 1; c < firstClassCol + numClasses; c++) {
    for (const r of [headerRow, headerRow + 1, headerRow + 2]) {
      const hc = ws.getCell(r, c)
      hc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }
      hc.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      hc.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      hc.border = BORDER
    }
  }

  // Legenda KODE GURU
  ws.mergeCells(headerRow, legendCol, headerRow, legendCol + 2)
  const legendHead = ws.getCell(headerRow, legendCol)
  legendHead.value = 'KODE GURU'
  legendHead.font = { bold: true }
  legendHead.alignment = { horizontal: 'center' }
  legendHead.border = BORDER
  const subjectsByTeacher = new Map<string, Set<string>>()
  for (const e of state.entries) {
    if (e.teacherId === null) continue
    const subject = subjectsById.get(e.subjectId)
    if (!subject) continue
    const set = subjectsByTeacher.get(e.teacherId) ?? new Set<string>()
    set.add(subject.name)
    subjectsByTeacher.set(e.teacherId, set)
  }
  state.teachers.forEach((t, i) => {
    const r = headerRow + 1 + i
    const values = [t.code, t.name, [...(subjectsByTeacher.get(t.id) ?? [])].join(' / ')]
    values.forEach((v, j) => {
      const cell = ws.getCell(r, legendCol + j)
      cell.value = v
      cell.border = BORDER
      cell.alignment = { vertical: 'middle', wrapText: true }
    })
  })

  // Isi jadwal per hari
  const entryBySlot = new Map<string, (typeof state.entries)[number]>()
  for (const e of state.entries) {
    entryBySlot.set(`${e.day}|${e.periodId}|${e.classId}`, e)
  }

  let r = dataStart
  for (let day = 0; day < DAYS.length; day++) {
    const periods = state.daySchedules[day] ?? []
    if (periods.length === 0) continue
    const numbers = lessonNumbers(periods)
    const blockStart = r

    for (const period of periods) {
      ws.getCell(r, 2).value = period.label !== null ? '' : numbers.get(period.id)
      ws.getCell(r, 3).value = timeRange(period.start, period.end)

      if (period.label !== null) {
        state.classes.forEach((_, i) => {
          ws.getCell(r, firstClassCol + i).value = period.label
        })
      } else {
        state.classes.forEach((cls, i) => {
          const entry = entryBySlot.get(`${day}|${period.id}|${cls.id}`)
          if (!entry) return
          const cell = ws.getCell(r, firstClassCol + i)
          if (entry.teacherId !== null) {
            cell.value = teachersById.get(entry.teacherId)?.code ?? '?'
            const color = subjectsById.get(entry.subjectId)?.color
            if (color) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: toArgb(color) } }
            }
          } else {
            // Kegiatan per kelas tanpa guru (mis. P5BK): tulis nama mapelnya.
            cell.value = subjectsById.get(entry.subjectId)?.name ?? '?'
          }
        })
      }

      for (let c = 1; c < firstClassCol + numClasses; c++) {
        const cell = ws.getCell(r, c)
        cell.border = BORDER
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
        if (period.label !== null && c >= 2) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ACTIVITY_FILL } }
          cell.font = { italic: true }
        }
      }
      r++
    }

    ws.mergeCells(blockStart, 1, r - 1, 1)
    const dayCell = ws.getCell(blockStart, 1)
    dayCell.value = DAYS[day].toUpperCase()
    dayCell.font = { bold: true }
    dayCell.alignment = { horizontal: 'center', vertical: 'middle', textRotation: 90 }
  }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'jadwal-pelajaran.xlsx'
  link.click()
  URL.revokeObjectURL(url)
}
