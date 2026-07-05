import { useSchedule } from '../state/context'
import { ScheduleGrid } from './ScheduleGrid'
import { EntryCell } from './EntryCell'

interface TeacherSchedulePageProps {
  teacherId: string
  onSelectTeacher: (id: string) => void
}

export function TeacherSchedulePage({ teacherId, onSelectTeacher }: TeacherSchedulePageProps) {
  const { state, conflicts } = useSchedule()

  const selectedTeacher = state.teachers.find((t) => t.id === teacherId)
  if (!selectedTeacher) return null

  const subjectsById = new Map(state.subjects.map((s) => [s.id, s]))
  const classesById = new Map(state.classes.map((c) => [c.id, c]))

  return (
    <section className="page">
      <div className="page-header no-print">
        <label>
          Guru:{' '}
          <select value={teacherId} onChange={(e) => onSelectTeacher(e.target.value)}>
            {state.teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.code})
              </option>
            ))}
          </select>
        </label>
        <p className="hint">Tampilan baca-saja. Ubah jadwal lewat tab "Jadwal per Kelas".</p>
      </div>

      <h2 className="print-title">
        Jadwal Mengajar {selectedTeacher.name} ({selectedTeacher.code})
      </h2>

      <ScheduleGrid
        periods={state.periods}
        renderCell={(day, period) => {
          const slotEntries = state.entries.filter(
            (e) => e.teacherId === teacherId && e.day === day && e.periodId === period.id,
          )
          if (slotEntries.length === 0) return null
          return (
            <div className="cell-stack">
              {slotEntries.map((entry) => {
                const subject = subjectsById.get(entry.subjectId)
                const cls = classesById.get(entry.classId)
                return (
                  <EntryCell
                    key={entry.id}
                    title={`Kelas ${cls?.name ?? '?'}`}
                    subtitle={subject?.name ?? '?'}
                    color={subject?.color}
                    isConflict={conflicts.entryIds.has(entry.id)}
                  />
                )
              })}
            </div>
          )
        }}
      />
    </section>
  )
}
