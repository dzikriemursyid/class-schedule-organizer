import { SUBJECT_COLORS, type AppState, type Assignment, type Subject, type Teacher } from '../types'
import { makeDefaultDaySchedules } from './scheduleReducer'

// Warna diambil dari palet (tanpa merah) dan diberi jarak agar antar mapel kontras.
const paletteColor = (i: number) => SUBJECT_COLORS[(i * 13) % SUBJECT_COLORS.length]

const teachers: Teacher[] = [
  { id: 't-af', name: 'Ahmad Fauzi', code: 'AF' },
  { id: 't-sr', name: 'Siti Rahayu', code: 'SR' },
  { id: 't-bs', name: 'Budi Santoso', code: 'BS' },
  { id: 't-dl', name: 'Dewi Lestari', code: 'DL' },
  { id: 't-ep', name: 'Eko Prasetyo', code: 'EP' },
  { id: 't-fh', name: 'Fitri Handayani', code: 'FH' },
  { id: 't-gr', name: 'Gilang Ramadhan', code: 'GR', maxPerDay: 6 },
  { id: 't-hp', name: 'Hana Puspita', code: 'HP' },
]

// Informatika (praktik Lab) hanya untuk kelas 8 & 9 → contoh "mapel khusus kelas".
const INF_CLASSES = ['c-8a', 'c-8b', 'c-9a']

const SUBJECT_DEFS: Array<Omit<Subject, 'color'>> = [
  { id: 's-mtk', name: 'Matematika', maxJpPerWeek: 4 },
  { id: 's-bin', name: 'Bahasa Indonesia', maxJpPerWeek: 4 },
  { id: 's-big', name: 'Bahasa Inggris', maxJpPerWeek: 3 },
  { id: 's-ipa', name: 'IPA', maxJpPerWeek: 4 },
  { id: 's-ips', name: 'IPS', maxJpPerWeek: 3 },
  { id: 's-pai', name: 'Pendidikan Agama', maxJpPerWeek: 2 },
  { id: 's-pjok', name: 'PJOK', maxJpPerWeek: 2, distribution: 'ganda', timePreference: 'pagi' },
  { id: 's-sbd', name: 'Seni Budaya', maxJpPerWeek: 2 },
  { id: 's-ppkn', name: 'PPKn', maxJpPerWeek: 2 },
  { id: 's-inf', name: 'Informatika', maxJpPerWeek: 3, distribution: 'blok', classIds: INF_CLASSES },
]

const subjects: Subject[] = SUBJECT_DEFS.map((s, i) => ({ ...s, color: paletteColor(i) }))

const classes = [
  { id: 'c-7a', name: '7A' },
  { id: 'c-7b', name: '7B' },
  { id: 'c-8a', name: '8A' },
  { id: 'c-8b', name: '8B' },
  { id: 'c-9a', name: '9A' },
  { id: 'c-9b', name: '9B' },
]

// Penugasan: satu guru mengampu satu mapel untuk kelas yang di-avail.
const SUBJECT_TEACHER: Array<[subjectId: string, teacherId: string]> = [
  ['s-mtk', 't-af'],
  ['s-bin', 't-sr'],
  ['s-big', 't-bs'],
  ['s-ipa', 't-dl'],
  ['s-ips', 't-ep'],
  ['s-pai', 't-fh'],
  ['s-pjok', 't-gr'],
  ['s-inf', 't-hp'],
]

function buildAssignments(): Assignment[] {
  const subjectsById = new Map(subjects.map((s) => [s.id, s]))
  const out: Assignment[] = []
  for (const [subjectId, teacherId] of SUBJECT_TEACHER) {
    const subject = subjectsById.get(subjectId)!
    const allowed = subject.classIds ?? classes.map((c) => c.id)
    for (const classId of allowed) {
      out.push({
        id: crypto.randomUUID(),
        teacherId,
        subjectId,
        classId,
        jp: subject.maxJpPerWeek ?? 2,
      })
    }
  }
  return out
}

export function buildSeedState(): AppState {
  return {
    version: 3,
    teachers,
    subjects,
    classes,
    daySchedules: makeDefaultDaySchedules(),
    entries: [],
    assignments: buildAssignments(),
  }
}
