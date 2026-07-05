import type { AppState, Assignment, Subject, Teacher } from '../types'
import { makeDefaultDaySchedules } from './scheduleReducer'

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

const subjects: Subject[] = [
  { id: 's-mtk', name: 'Matematika', color: '#bae6fd', maxJpPerWeek: 4 },
  { id: 's-bin', name: 'Bahasa Indonesia', color: '#fecaca', maxJpPerWeek: 4 },
  { id: 's-big', name: 'Bahasa Inggris', color: '#fde68a', maxJpPerWeek: 3 },
  { id: 's-ipa', name: 'IPA', color: '#bbf7d0', maxJpPerWeek: 4 },
  { id: 's-ips', name: 'IPS', color: '#fed7aa', maxJpPerWeek: 3 },
  { id: 's-pai', name: 'Pendidikan Agama', color: '#d9f99d', maxJpPerWeek: 2 },
  {
    id: 's-pjok',
    name: 'PJOK',
    color: '#a5f3fc',
    maxJpPerWeek: 2,
    distribution: 'ganda',
    timePreference: 'pagi',
  },
  { id: 's-sbd', name: 'Seni Budaya', color: '#f5d0fe', maxJpPerWeek: 2 },
  { id: 's-ppkn', name: 'PPKn', color: '#c7d2fe', maxJpPerWeek: 2 },
  {
    id: 's-inf',
    name: 'Informatika',
    color: '#99f6e4',
    maxJpPerWeek: 3,
    distribution: 'blok',
    classIds: INF_CLASSES,
  },
]

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
