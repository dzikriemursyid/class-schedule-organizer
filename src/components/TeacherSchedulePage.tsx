import { useState } from 'react'
import { teacherLabel, type Period } from '../types'
import { useSchedule } from '../state/context'
import { ScheduleGrid } from './ScheduleGrid'
import { EntryCell } from './EntryCell'
import { EntryDialog } from './EntryDialog'

interface TeacherSchedulePageProps {
  teacherId: string
  onSelectTeacher: (id: string) => void
}

type Editing = { classId: string; day: number; period: Period }

export function TeacherSchedulePage({ teacherId, onSelectTeacher }: TeacherSchedulePageProps) {
  const { state, conflicts } = useSchedule()
  const [editing, setEditing] = useState<Editing | null>(null)
  // Sel kosong: pilih kelas dulu sebelum membuka dialog.
  const [picking, setPicking] = useState<{ day: number; period: Period } | null>(null)

  const selectedTeacher = state.teachers.find((t) => t.id === teacherId)
  if (!selectedTeacher) return null

  const subjectsById = new Map(state.subjects.map((s) => [s.id, s]))
  const classesById = new Map(state.classes.map((c) => [c.id, c]))

  function handleCellClick(day: number, period: Period) {
    const slotEntries = state.entries.filter(
      (e) => e.teacherId === teacherId && e.day === day && e.periodId === period.id,
    )
    if (slotEntries.length === 1) {
      setEditing({ classId: slotEntries[0].classId, day, period })
    } else if (slotEntries.length > 1) {
      // Bentrok: edit entri pertama (sisanya lewat tab Kelas/Keseluruhan).
      setEditing({ classId: slotEntries[0].classId, day, period })
    } else {
      setPicking({ day, period })
    }
  }

  return (
    <section className="page">
      <div className="page-header no-print">
        <label>
          Guru:{' '}
          <select value={teacherId} onChange={(e) => onSelectTeacher(e.target.value)}>
            {state.teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {teacherLabel(t)}
              </option>
            ))}
          </select>
        </label>
        <p className="hint">Klik sel untuk mengisi/mengubah. Sel kosong akan menanyakan kelas dulu.</p>
      </div>

      <h2 className="print-title">Jadwal Mengajar {teacherLabel(selectedTeacher)}</h2>

      <ScheduleGrid
        daySchedules={state.daySchedules}
        onCellClick={handleCellClick}
        renderCell={(day, period) => {
          const slotEntries = state.entries.filter(
            (e) => e.teacherId === teacherId && e.day === day && e.periodId === period.id,
          )
          if (slotEntries.length === 0) return <span className="empty-cell">+</span>
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

      {picking && (
        <ClassPickerDialog
          onPick={(classId) => {
            setEditing({ classId, day: picking.day, period: picking.period })
            setPicking(null)
          }}
          onClose={() => setPicking(null)}
        />
      )}

      {editing && (
        <EntryDialog
          classId={editing.classId}
          day={editing.day}
          period={editing.period}
          defaultTeacherId={teacherId}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  )
}

function ClassPickerDialog({
  onPick,
  onClose,
}: {
  onPick: (classId: string) => void
  onClose: () => void
}) {
  const { state } = useSchedule()
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Pilih kelas untuk diisi</h3>
        <div className="class-picker">
          {state.classes.map((c) => (
            <button key={c.id} className="btn" onClick={() => onPick(c.id)}>
              {c.name}
            </button>
          ))}
          {state.classes.length === 0 && <p className="hint">Belum ada kelas.</p>}
        </div>
        <div className="modal-actions">
          <span className="spacer" />
          <button className="btn" onClick={onClose}>
            Batal
          </button>
        </div>
      </div>
    </div>
  )
}
