import type ExcelJS from 'exceljs'
import { DAYS, type AppState, type Period } from '../types'

const HEADER_FILL = 'FF1E3A5F'
const ACTIVITY_FILL = 'FFE2E8F0'
const BORDER = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
} satisfies Partial<ExcelJS.Borders>

interface CellContent {
  text: string
  color?: string
}

function toArgb(hex: string): string {
  return `FF${hex.replace('#', '').toUpperCase()}`
}

function sheetName(name: string): string {
  return name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31)
}

function addScheduleSheet(
  wb: ExcelJS.Workbook,
  title: string,
  daySchedules: Period[][],
  getCell: (day: number, period: Period) => CellContent | null,
) {
  const ws = wb.addWorksheet(sheetName(title))

  ws.columns = [{ width: 5 }, ...DAYS.map(() => ({ width: 28 }))]
  ws.views = [{ state: 'frozen', ySplit: 1 }]

  const header = ws.addRow(['No', ...DAYS])
  header.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = BORDER
  })

  // Susunan jam tiap hari bisa berbeda, jadi baris disejajarkan per urutan slot
  // dan waktu ditulis di dalam sel masing-masing.
  const maxSlots = Math.max(0, ...daySchedules.map((periods) => periods.length))
  for (let i = 0; i < maxSlots; i++) {
    const slots = DAYS.map((_, day) => daySchedules[day]?.[i] ?? null)
    const contents = slots.map((period, day) => {
      if (!period) return null
      const time = `${period.start}–${period.end}`
      if (period.label !== null) {
        return { text: `${time}\n${period.label.toUpperCase()}`, color: undefined }
      }
      const content = getCell(day, period)
      return {
        text: content ? `${time}\n${content.text}` : time,
        color: content?.color,
      }
    })

    const row = ws.addRow([i + 1, ...contents.map((c) => c?.text ?? '')])
    row.height = 34
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      if (col > 1 + DAYS.length) return
      cell.border = BORDER
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      if (col === 1) return
      const period = slots[col - 2]
      const content = contents[col - 2]
      if (period?.label != null) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ACTIVITY_FILL } }
        cell.font = { italic: true }
      } else if (content?.color) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: toArgb(content.color) } }
      }
    })
  }
}

export async function exportToExcel(state: AppState) {
  // Dynamic import supaya exceljs (~940 kB) tidak masuk bundle awal.
  const { default: ExcelJS } = await import('exceljs')
  const subjectsById = new Map(state.subjects.map((s) => [s.id, s]))
  const teachersById = new Map(state.teachers.map((t) => [t.id, t]))
  const classesById = new Map(state.classes.map((c) => [c.id, c]))

  const wb = new ExcelJS.Workbook()
  wb.created = new Date()

  for (const cls of state.classes) {
    addScheduleSheet(wb, `Kelas ${cls.name}`, state.daySchedules, (day, period) => {
      const entry = state.entries.find(
        (e) => e.classId === cls.id && e.day === day && e.periodId === period.id,
      )
      if (!entry) return null
      const subject = subjectsById.get(entry.subjectId)
      const teacher = teachersById.get(entry.teacherId)
      return {
        text: `${subject?.name ?? '?'} — ${teacher?.code ?? '?'}`,
        color: subject?.color,
      }
    })
  }

  for (const teacher of state.teachers) {
    addScheduleSheet(wb, `Guru ${teacher.code} ${teacher.name}`, state.daySchedules, (day, period) => {
      const slotEntries = state.entries.filter(
        (e) => e.teacherId === teacher.id && e.day === day && e.periodId === period.id,
      )
      if (slotEntries.length === 0) return null
      const text = slotEntries
        .map((e) => {
          const cls = classesById.get(e.classId)
          const subject = subjectsById.get(e.subjectId)
          return `${cls?.name ?? '?'} — ${subject?.name ?? '?'}`
        })
        .join(' / ')
      const subject = subjectsById.get(slotEntries[0].subjectId)
      return { text, color: subject?.color }
    })
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
