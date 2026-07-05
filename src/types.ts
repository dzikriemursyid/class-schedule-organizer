export const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'] as const

function hslToHex(h: number, s: number, l: number): string {
  const ll = l / 100
  const a = (s * Math.min(ll, 1 - ll)) / 100
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = ll - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

// Warna mapel pastel yang terang (teks gelap tetap terbaca). Rentang hue merah
// (≈345–15°) SENGAJA dilewati supaya warna merah khusus dipakai untuk menandai
// bentrok — lihat .entry-chip.conflict di index.css.
const PALETTE_HUES = [
  20, 35, 50, 65, 80, 95, 110, 125, 140, 155, 170, 185, 200, 215, 230, 245, 260, 275, 290, 305,
]
const PALETTE_RINGS: Array<[s: number, l: number]> = [
  [68, 84],
  [80, 89],
  [50, 79],
]

// 20 hue × 3 ring = 60 warna berbeda; hue diselang-seling agar warna
// berdekatan di daftar tetap kontras.
export const SUBJECT_COLORS: string[] = PALETTE_RINGS.flatMap(([s, l]) =>
  PALETTE_HUES.map((h) => hslToHex(h, s, l)),
)

export interface Teacher {
  id: string
  name: string
  /** Kode/inisial singkat; boleh kosong ('') — tampilan pakai nama kalau kosong. */
  code: string
  /** Batas maksimum jam pelajaran mengajar per hari (opsional). */
  maxPerDay?: number
  /** Slot "${day}|${periodId}" saat guru tidak bisa mengajar. */
  unavailable?: string[]
}

export type Distribution = 'sebar' | 'ganda' | 'blok'
export type TimePreference = 'pagi' | 'bebas'

/** Ambang "pagi": blok bertanda 'pagi' harus mulai di jam ke- <= nilai ini. */
export const PAGI_THRESHOLD = 4

export interface Subject {
  id: string
  name: string
  color: string
  /** JP/minggu per kelas — dipakai sebagai default & batas atas JP penugasan. */
  maxJpPerWeek?: number
  /** Kelas yang boleh mengambil mapel ini; undefined/kosong = semua kelas. */
  classIds?: string[]
  /** Cara memecah JP ke slot; default 'sebar'. */
  distribution?: Distribution
  /** Preferensi waktu; default 'bebas'. */
  timePreference?: TimePreference
}

export interface ClassGroup {
  id: string
  name: string
}

export interface Assignment {
  id: string
  teacherId: string
  subjectId: string
  classId: string
  /** Jumlah jam pelajaran per minggu. */
  jp: number
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
  version: 3
  teachers: Teacher[]
  subjects: Subject[]
  classes: ClassGroup[]
  /** Susunan jam per hari, index mengikuti DAYS (0 = Senin .. 4 = Jumat). */
  daySchedules: Period[][]
  entries: ScheduleEntry[]
  /** Penugasan mengajar (input untuk alokasi otomatis). */
  assignments: Assignment[]
}

/** Kelas yang boleh mengambil sebuah mapel (classIds kosong/undefined = semua). */
export function subjectClassIds(subject: Subject, allClasses: ClassGroup[]): string[] {
  if (!subject.classIds || subject.classIds.length === 0) return allClasses.map((c) => c.id)
  return subject.classIds
}

/** Label tampilan guru: "Nama (KODE)" atau hanya "Nama" bila kode kosong. */
export function teacherLabel(teacher: Pick<Teacher, 'name' | 'code'>): string {
  return teacher.code.trim() !== '' ? `${teacher.name} (${teacher.code})` : teacher.name
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
