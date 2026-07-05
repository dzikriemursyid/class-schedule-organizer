import type {
  AppState,
  Assignment,
  ClassGroup,
  Period,
  ScheduleEntry,
  SlotAssignment,
  Subject,
  Teacher,
} from '../types'
import { DAYS } from '../types'

export const STORAGE_KEY = 'class-schedule-organizer:v3'
const LEGACY_KEY_V2 = 'class-schedule-organizer:v2'
const LEGACY_KEY_V1 = 'class-schedule-organizer:v1'

export type Action =
  | { type: 'ADD_TEACHER'; teacher: Teacher }
  | { type: 'UPDATE_TEACHER'; teacher: Teacher }
  | { type: 'REMOVE_TEACHER'; id: string }
  | { type: 'ADD_SUBJECT'; subject: Subject }
  | { type: 'UPDATE_SUBJECT'; subject: Subject }
  | { type: 'REMOVE_SUBJECT'; id: string }
  | { type: 'ADD_CLASS'; classGroup: ClassGroup }
  | { type: 'UPDATE_CLASS'; classGroup: ClassGroup }
  | { type: 'REMOVE_CLASS'; id: string }
  | { type: 'ADD_ASSIGNMENT'; assignment: Assignment }
  | { type: 'UPDATE_ASSIGNMENT'; assignment: Assignment }
  | { type: 'REMOVE_ASSIGNMENT'; id: string }
  | { type: 'SET_DAY_SCHEDULES'; daySchedules: Period[][] }
  | { type: 'SET_SLOTS'; slots: SlotAssignment[] }
  | { type: 'CLEAR_SLOT'; day: number; periodId: string; classId: string }
  | { type: 'APPLY_ALLOCATION'; entries: ScheduleEntry[]; mode: 'fill' | 'overwrite' }
  | { type: 'LOAD_STATE'; state: AppState }

type PeriodRow = [start: string, end: string, label: string | null]

const STANDARD_DAY: PeriodRow[] = [
  ['07:00', '07:45', null],
  ['07:45', '08:30', null],
  ['08:30', '09:15', null],
  ['09:15', '09:35', 'Istirahat'],
  ['09:35', '10:20', null],
  ['10:20', '11:05', null],
  ['11:05', '11:50', null],
  ['11:50', '12:30', 'Istirahat'],
  ['12:30', '13:15', null],
  ['13:15', '14:00', null],
]

const SENIN: PeriodRow[] = [['07:00', '07:45', 'Upacara'], ...STANDARD_DAY.slice(1)]

const JUMAT: PeriodRow[] = [
  ['07:00', '07:40', null],
  ['07:40', '08:20', null],
  ['08:20', '09:00', null],
  ['09:00', '09:20', 'Istirahat'],
  ['09:20', '10:00', null],
  ['10:00', '10:40', null],
  ['10:40', '11:20', null],
  ['11:20', '13:00', 'Solat Jumat'],
]

function makeDay(prefix: string, rows: PeriodRow[]): Period[] {
  return rows.map(([start, end, label], i) => ({ id: `${prefix}-${i + 1}`, start, end, label }))
}

export function makeDefaultDaySchedules(): Period[][] {
  return [
    makeDay('sen', SENIN),
    makeDay('sel', STANDARD_DAY),
    makeDay('rab', STANDARD_DAY),
    makeDay('kam', STANDARD_DAY),
    makeDay('jum', JUMAT),
  ]
}

export function initialState(): AppState {
  return {
    version: 3,
    teachers: [],
    subjects: [],
    classes: [],
    daySchedules: makeDefaultDaySchedules(),
    entries: [],
    assignments: [],
  }
}

interface PeriodV1 {
  id: string
  start: string
  end: string
  isBreak: boolean
}

interface AppStateV1 {
  version: 1
  teachers: Teacher[]
  subjects: Subject[]
  classes: ClassGroup[]
  periods: PeriodV1[]
  entries: ScheduleEntry[]
}

interface AppStateV2 {
  version: 2
  teachers: Teacher[]
  subjects: Subject[]
  classes: ClassGroup[]
  daySchedules: Period[][]
  entries: ScheduleEntry[]
}

/** Skema v1 punya satu susunan jam untuk semua hari; jadikan salinan per hari. */
function migrateV1toV2(old: AppStateV1): AppStateV2 {
  const toV2 = (p: PeriodV1): Period => ({
    id: p.id,
    start: p.start,
    end: p.end,
    label: p.isBreak ? 'Istirahat' : null,
  })
  return {
    version: 2,
    teachers: old.teachers,
    subjects: old.subjects,
    classes: old.classes,
    // Id period sengaja sama di tiap hari agar entry lama (day + periodId) tetap valid.
    daySchedules: DAYS.map(() => old.periods.map(toV2)),
    entries: old.entries,
  }
}

/** v2 -> v3: cukup tambah tabel penugasan kosong; sisanya kompatibel. */
function migrateV2toV3(old: AppStateV2): AppState {
  return { ...old, version: 3, assignments: [] }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      if (parsed.version === 3 && Array.isArray(parsed.assignments)) return parsed
      return initialState()
    }
    const v2 = localStorage.getItem(LEGACY_KEY_V2)
    if (v2) {
      const parsed = JSON.parse(v2) as AppStateV2
      if (parsed.version === 2 && Array.isArray(parsed.daySchedules)) return migrateV2toV3(parsed)
    }
    const v1 = localStorage.getItem(LEGACY_KEY_V1)
    if (v1) {
      const parsed = JSON.parse(v1) as AppStateV1
      if (parsed.version === 1 && Array.isArray(parsed.periods)) {
        return migrateV2toV3(migrateV1toV2(parsed))
      }
    }
    return initialState()
  } catch {
    return initialState()
  }
}

const slotKey = (e: { day: number; periodId: string; classId: string }) =>
  `${e.day}|${e.periodId}|${e.classId}`

export function scheduleReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_TEACHER':
      return { ...state, teachers: [...state.teachers, action.teacher] }
    case 'UPDATE_TEACHER':
      return {
        ...state,
        teachers: state.teachers.map((t) => (t.id === action.teacher.id ? action.teacher : t)),
      }
    case 'REMOVE_TEACHER':
      return {
        ...state,
        teachers: state.teachers.filter((t) => t.id !== action.id),
        entries: state.entries.filter((e) => e.teacherId !== action.id),
        assignments: state.assignments.filter((a) => a.teacherId !== action.id),
      }
    case 'ADD_SUBJECT':
      return { ...state, subjects: [...state.subjects, action.subject] }
    case 'UPDATE_SUBJECT':
      return {
        ...state,
        subjects: state.subjects.map((s) => (s.id === action.subject.id ? action.subject : s)),
      }
    case 'REMOVE_SUBJECT':
      return {
        ...state,
        subjects: state.subjects.filter((s) => s.id !== action.id),
        entries: state.entries.filter((e) => e.subjectId !== action.id),
        assignments: state.assignments.filter((a) => a.subjectId !== action.id),
      }
    case 'ADD_CLASS':
      return { ...state, classes: [...state.classes, action.classGroup] }
    case 'UPDATE_CLASS':
      return {
        ...state,
        classes: state.classes.map((c) => (c.id === action.classGroup.id ? action.classGroup : c)),
      }
    case 'REMOVE_CLASS':
      return {
        ...state,
        classes: state.classes.filter((c) => c.id !== action.id),
        entries: state.entries.filter((e) => e.classId !== action.id),
        assignments: state.assignments.filter((a) => a.classId !== action.id),
        subjects: state.subjects.map((s) =>
          s.classIds ? { ...s, classIds: s.classIds.filter((id) => id !== action.id) } : s,
        ),
      }
    case 'ADD_ASSIGNMENT':
      return { ...state, assignments: [...state.assignments, action.assignment] }
    case 'UPDATE_ASSIGNMENT':
      return {
        ...state,
        assignments: state.assignments.map((a) =>
          a.id === action.assignment.id ? action.assignment : a,
        ),
      }
    case 'REMOVE_ASSIGNMENT':
      return { ...state, assignments: state.assignments.filter((a) => a.id !== action.id) }
    case 'SET_DAY_SCHEDULES': {
      const lessonIdsPerDay = action.daySchedules.map(
        (periods) => new Set(periods.filter((p) => p.label === null).map((p) => p.id)),
      )
      return {
        ...state,
        daySchedules: action.daySchedules,
        entries: state.entries.filter((e) => lessonIdsPerDay[e.day]?.has(e.periodId)),
      }
    }
    case 'SET_SLOTS': {
      const replaced = new Set(action.slots.map(slotKey))
      const kept = state.entries.filter((e) => !replaced.has(slotKey(e)))
      const added: ScheduleEntry[] = action.slots.map((slot) => ({
        id: crypto.randomUUID(),
        ...slot,
      }))
      return { ...state, entries: [...kept, ...added] }
    }
    case 'CLEAR_SLOT': {
      const key = slotKey(action)
      return { ...state, entries: state.entries.filter((e) => slotKey(e) !== key) }
    }
    case 'APPLY_ALLOCATION':
      return {
        ...state,
        entries:
          action.mode === 'overwrite' ? action.entries : [...state.entries, ...action.entries],
      }
    case 'LOAD_STATE':
      return action.state
  }
}
