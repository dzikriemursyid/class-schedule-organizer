import type { AppState, ScheduleEntry } from '../types'
import { makeDefaultPeriods } from './scheduleReducer'

const teachers = [
  { id: 't-af', name: 'Ahmad Fauzi', code: 'AF' },
  { id: 't-sr', name: 'Siti Rahayu', code: 'SR' },
  { id: 't-bs', name: 'Budi Santoso', code: 'BS' },
  { id: 't-dl', name: 'Dewi Lestari', code: 'DL' },
  { id: 't-ep', name: 'Eko Prasetyo', code: 'EP' },
  { id: 't-fh', name: 'Fitri Handayani', code: 'FH' },
  { id: 't-gr', name: 'Gilang Ramadhan', code: 'GR' },
  { id: 't-hp', name: 'Hana Puspita', code: 'HP' },
]

const subjects = [
  { id: 's-mtk', name: 'Matematika', color: '#bae6fd' },
  { id: 's-bin', name: 'Bahasa Indonesia', color: '#fecaca' },
  { id: 's-big', name: 'Bahasa Inggris', color: '#fde68a' },
  { id: 's-ipa', name: 'IPA', color: '#bbf7d0' },
  { id: 's-ips', name: 'IPS', color: '#fed7aa' },
  { id: 's-pai', name: 'Pendidikan Agama', color: '#d9f99d' },
  { id: 's-pjok', name: 'PJOK', color: '#a5f3fc' },
  { id: 's-sbd', name: 'Seni Budaya', color: '#f5d0fe' },
  { id: 's-ppkn', name: 'PPKn', color: '#c7d2fe' },
  { id: 's-inf', name: 'Informatika', color: '#99f6e4' },
]

const classes = [
  { id: 'c-7a', name: '7A' },
  { id: 'c-7b', name: '7B' },
  { id: 'c-8a', name: '8A' },
  { id: 'c-8b', name: '8B' },
  { id: 'c-9a', name: '9A' },
  { id: 'c-9b', name: '9B' },
]

function entry(
  day: number,
  periodId: string,
  classId: string,
  subjectId: string,
  teacherId: string,
): ScheduleEntry {
  return { id: crypto.randomUUID(), day, periodId, classId, subjectId, teacherId }
}

export function buildSeedState(): AppState {
  const entries: ScheduleEntry[] = [
    // Kelas 7A — Senin
    entry(0, 'p1', 'c-7a', 's-mtk', 't-af'),
    entry(0, 'p2', 'c-7a', 's-mtk', 't-af'),
    entry(0, 'p3', 'c-7a', 's-bin', 't-sr'),
    entry(0, 'p5', 'c-7a', 's-ipa', 't-dl'),
    entry(0, 'p6', 'c-7a', 's-ipa', 't-dl'),
    entry(0, 'p7', 'c-7a', 's-big', 't-bs'),
    entry(0, 'p9', 'c-7a', 's-pjok', 't-gr'),
    entry(0, 'p10', 'c-7a', 's-pjok', 't-gr'),
    // Kelas 7A — Selasa
    entry(1, 'p1', 'c-7a', 's-bin', 't-sr'),
    entry(1, 'p2', 'c-7a', 's-bin', 't-sr'),
    entry(1, 'p3', 'c-7a', 's-ips', 't-ep'),
    entry(1, 'p5', 'c-7a', 's-pai', 't-fh'),
    entry(1, 'p6', 'c-7a', 's-sbd', 't-hp'),
    // Kelas 7B — Senin
    entry(0, 'p1', 'c-7b', 's-ipa', 't-dl'),
    entry(0, 'p2', 'c-7b', 's-ipa', 't-dl'),
    entry(0, 'p3', 'c-7b', 's-mtk', 't-af'),
    entry(0, 'p5', 'c-7b', 's-big', 't-bs'),
    entry(0, 'p6', 'c-7b', 's-bin', 't-sr'),
    entry(0, 'p7', 'c-7b', 's-bin', 't-sr'),
    entry(0, 'p9', 'c-7b', 's-sbd', 't-hp'),
    // Kelas 7B — Selasa
    entry(1, 'p1', 'c-7b', 's-ips', 't-ep'),
    entry(1, 'p2', 'c-7b', 's-ips', 't-ep'),
    entry(1, 'p3', 'c-7b', 's-pai', 't-fh'),
    entry(1, 'p5', 'c-7b', 's-mtk', 't-af'),
    entry(1, 'p6', 'c-7b', 's-mtk', 't-af'),
  ]

  return {
    version: 1,
    teachers,
    subjects,
    classes,
    periods: makeDefaultPeriods(),
    entries,
  }
}
