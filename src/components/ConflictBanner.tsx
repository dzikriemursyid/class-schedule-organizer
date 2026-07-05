import { DAYS, lessonNumbers } from '../types'
import { useSchedule } from '../state/context'

interface ConflictBannerProps {
  onShowTeacher: (teacherId: string) => void
}

export function ConflictBanner({ onShowTeacher }: ConflictBannerProps) {
  const { state, conflicts } = useSchedule()
  if (conflicts.groups.length === 0) return null

  return (
    <div className="conflict-banner">
      <strong>⚠ {conflicts.groups.length} jadwal bentrok</strong>
      <ul>
        {conflicts.groups.map((group) => {
          const numbers = lessonNumbers(state.daySchedules[group.day] ?? [])
          const teacher = state.teachers.find((t) => t.id === group.teacherId)
          const classNames = group.entries
            .map((e) => state.classes.find((c) => c.id === e.classId)?.name ?? '?')
            .join(' & ')
          return (
            <li key={`${group.teacherId}-${group.day}-${group.periodId}`}>
              {teacher?.name ?? '?'} mengajar {classNames} sekaligus pada {DAYS[group.day]} jam
              ke-{numbers.get(group.periodId)}.{' '}
              <button className="link-btn" onClick={() => onShowTeacher(group.teacherId)}>
                Lihat jadwal guru
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
