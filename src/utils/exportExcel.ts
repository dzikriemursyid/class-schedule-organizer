import type ExcelJS from 'exceljs'
import { DAYS, lessonNumbers, type AppState, type Period } from '../types'

const HEADER_FILL = 'FF1E3A5F'
const BREAK_FILL = 'FFE2E8F0'
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
  periods: Period[],
  getCell: (day: number, period: Period) => CellContent | null,
) {
  const ws = wb.addWorksheet(sheetName(title))
  const numbers = lessonNumbers(periods)

  ws.columns = [
    { width: 9 },
    { width: 15 },
    ...DAYS.map(() => ({ width: 26 })),
  ]
  ws.views = [{ state: 'frozen', ySplit: 1 }]

  const header = ws.addRow(['Jam ke-', 'Waktu', ...DAYS])
  header.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = BORDER
  })

  for (const period of periods) {
    const time = `${period.start}–${period.end}`
    if (period.isBreak) {
      const row = ws.addRow(['', time, 'ISTIRAHAT'])
      ws.mergeCells(row.number, 3, row.number, 2 + DAYS.length)
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        if (col > 2 + DAYS.length) return
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BREAK_FILL } }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.font = { italic: true }
        cell.border = BORDER
      })
      continue
    }

    const contents = DAYS.map((_, day) => getCell(day, period))
    const row = ws.addRow([
      numbers.get(period.id),
      time,
      ...contents.map((c) => c?.text ?? ''),
    ])
    row.height = 30
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      if (col > 2 + DAYS.length) return
      cell.border = BORDER
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      const content = col > 2 ? contents[col - 3] : null
      if (content?.color) {
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
    addScheduleSheet(wb, `Kelas ${cls.name}`, state.periods, (day, period) => {
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
    addScheduleSheet(wb, `Guru ${teacher.code} ${teacher.name}`, state.periods, (day, period) => {
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
