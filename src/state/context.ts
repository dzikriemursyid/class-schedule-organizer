import { createContext, useContext, type Dispatch } from 'react'
import type { AppState } from '../types'
import type { Action } from './scheduleReducer'
import type { ConflictInfo } from '../utils/conflicts'

export interface ScheduleContextValue {
  state: AppState
  dispatch: Dispatch<Action>
  conflicts: ConflictInfo
}

export const ScheduleContext = createContext<ScheduleContextValue | null>(null)

export function useSchedule(): ScheduleContextValue {
  const ctx = useContext(ScheduleContext)
  if (!ctx) throw new Error('useSchedule harus dipakai di dalam ScheduleProvider')
  return ctx
}
