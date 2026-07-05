import { useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { ScheduleContext } from './context'
import { loadState, scheduleReducer, STORAGE_KEY } from './scheduleReducer'
import { findConflicts } from '../utils/conflicts'

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(scheduleReducer, undefined, loadState)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const conflicts = useMemo(() => findConflicts(state.entries), [state.entries])
  const value = useMemo(() => ({ state, dispatch, conflicts }), [state, conflicts])

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>
}
