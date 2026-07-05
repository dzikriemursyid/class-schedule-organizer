import { useState } from 'react'
import type { Period } from '../types'
import { useSchedule } from '../state/context'
import { ScheduleGrid } from './ScheduleGrid'
import { EntryCell } from './EntryCell'
import { EntryDialog } from './EntryDialog'

interface ClassSchedulePageProps {
  classId: string
  onSelectClass: (id: string) => void
}

export function ClassSchedulePage({ classId, onSelectClass }: ClassSchedulePageProps) {
  const { state, conflicts } = useSchedule()
  const [editingSlot, setEditingSlot] = useState<{ day: number; period: Period } | null>(null)

  const selectedClass = state.classes.find((c) => c.id === classId)
  if (!selectedClass) return null

  const subjectsById = new Map(state.subjects.map((s) => [s.id, s]))
  const teachersById = new Map(state.teachers.map((t) => [t.id, t]))

  return (
    <section className="page">
      <div className="page-header no-print">
        <label>
          Kelas:{' '}
          <select value={classId} onChange={(e) => onSelectClass(e.target.value)}>
            {state.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <p className="hint">Klik sel untuk mengisi atau mengubah jadwal.</p>
      </div>

      <h2 className="print-title">Jadwal Pelajaran Kelas {selectedClass.name}</h2>

      <ScheduleGrid
        daySchedules={state.daySchedules}
        onCellClick={(day, period) => setEditingSlot({ day, period })}
        renderCell={(day, period) => {
          const entry = state.entries.find(
            (e) => e.classId === classId && e.day === day && e.periodId === period.id,
          )
          if (!entry) return <span className="empty-cell">+</span>
          const subject = subjectsById.get(entry.subjectId)
          const teacher = teachersById.get(entry.teacherId)
          return (
            <EntryCell
              title={subject?.name ?? '?'}
              subtitle={teacher ? `${teacher.name} (${teacher.code})` : '?'}
              color={subject?.color}
              isConflict={conflicts.entryIds.has(entry.id)}
            />
          )
        }}
      />

      {editingSlot && (
        <EntryDialog
          classId={classId}
          day={editingSlot.day}
          period={editingSlot.period}
          onClose={() => setEditingSlot(null)}
        />
      )}
    </section>
  )
}
