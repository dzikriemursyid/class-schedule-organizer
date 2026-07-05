export const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'] as const

export const SUBJECT_COLORS = [
  '#fecaca',
  '#fed7aa',
  '#fde68a',
  '#d9f99d',
  '#bbf7d0',
  '#99f6e4',
  '#a5f3fc',
  '#bae6fd',
  '#c7d2fe',
  '#ddd6fe',
  '#f5d0fe',
  '#fecdd3',
] as const

export interface Teacher {
  id: string
  name: string
  code: string
}

export interface Subject {
  id: string
  name: string
  color: string
}

export interface ClassGroup {
  id: string
  name: string
}

export interface Period {
  id: string
  start: string
  end: string
  /** Nama kegiatan non-KBM ("Istirahat", "Upacara", "Solat Jumat"); null = jam pelajaran. */
  label: string | null
}

export interface ScheduleEntry {
  id: string
  day: number
  periodId: string
  classId: string
  subjectId: string
  /** null = kegiatan tanpa guru pengampu (mis. P5BK). */
  teacherId: string | null
}

export interface SlotAssignment {
  day: number
  periodId: string
  classId: string
  subjectId: string
  teacherId: string | null
}

export interface AppState {
  version: 2
  teachers: Teacher[]
  subjects: Subject[]
  classes: ClassGroup[]
  /** Susunan jam per hari, index mengikuti DAYS (0 = Senin .. 4 = Jumat). */
  daySchedules: Period[][]
  entries: ScheduleEntry[]
}

/** Nomor "jam ke-" per period; slot kegiatan (label terisi) tidak ikut dihitung. */
export function lessonNumbers(periods: Period[]): Map<string, number> {
  const map = new Map<string, number>()
  let n = 0
  for (const p of periods) {
    if (p.label === null) map.set(p.id, ++n)
  }
  return map
}
