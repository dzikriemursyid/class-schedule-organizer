import type {
  AppState,
  ClassGroup,
  Period,
  ScheduleEntry,
  SlotAssignment,
  Subject,
  Teacher,
} from '../types'

export const STORAGE_KEY = 'class-schedule-organizer:v1'

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
  | { type: 'SET_PERIODS'; periods: Period[] }
  | { type: 'SET_SLOTS'; slots: SlotAssignment[] }
  | { type: 'CLEAR_SLOT'; day: number; periodId: string; classId: string }
  | { type: 'LOAD_STATE'; state: AppState }

export function makeDefaultPeriods(): Period[] {
  const rows: Array<[string, string, string, boolean]> = [
    ['p1', '07:00', '07:45', false],
    ['p2', '07:45', '08:30', false],
    ['p3', '08:30', '09:15', false],
    ['p4', '09:15', '09:35', true],
    ['p5', '09:35', '10:20', false],
    ['p6', '10:20', '11:05', false],
    ['p7', '11:05', '11:50', false],
    ['p8', '11:50', '12:30', true],
    ['p9', '12:30', '13:15', false],
    ['p10', '13:15', '14:00', false],
  ]
  return rows.map(([id, start, end, isBreak]) => ({ id, start, end, isBreak }))
}

export function initialState(): AppState {
  return {
    version: 1,
    teachers: [],
    subjects: [],
    classes: [],
    periods: makeDefaultPeriods(),
    entries: [],
  }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState()
    const parsed = JSON.parse(raw) as AppState
    if (parsed.version !== 1 || !Array.isArray(parsed.periods)) return initialState()
    return parsed
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
      }
    case 'SET_PERIODS': {
      const lessonIds = new Set(action.periods.filter((p) => !p.isBreak).map((p) => p.id))
      return {
        ...state,
        periods: action.periods,
        entries: state.entries.filter((e) => lessonIds.has(e.periodId)),
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
    case 'LOAD_STATE':
      return action.state
  }
}
