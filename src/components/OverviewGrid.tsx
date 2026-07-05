import { useState } from 'react'
import { DAYS, lessonNumbers, teacherLabel, type Period } from '../types'
import { useSchedule } from '../state/context'
import { EntryCell } from './EntryCell'
import { EntryDialog } from './EntryDialog'

type Editing = { classId: string; day: number; period: Period }

/**
 * Jadwal seluruh kelas sekaligus (mirip layout papan jadwal sekolah): hari
 * ditumpuk vertikal, kolom = semua kelas. Tiap sel bisa diklik untuk diedit;
 * karena semua tab berbagi state reducer, perubahan langsung tampak di mana pun.
 */
export function OverviewGrid() {
  const { state, conflicts } = useSchedule()
  const [editing, setEditing] = useState<Editing | null>(null)

  const subjectsById = new Map(state.subjects.map((s) => [s.id, s]))
  const teachersById = new Map(state.teachers.map((t) => [t.id, t]))
  const entryAt = new Map(
    state.entries.map((e) => [`${e.classId}|${e.day}|${e.periodId}`, e]),
  )

  if (state.classes.length === 0) return null

  return (
    <section className="page">
      <div className="page-header no-print">
        <p className="hint">
          Semua kelas sekaligus. Klik sel untuk mengisi/mengubah — perubahan langsung sinkron di
          semua tab.
        </p>
      </div>

      <h2 className="print-title">Jadwal Pelajaran — Semua Kelas</h2>

      <div className="grid-wrapper overview-wrapper">
        <table className="overview-grid">
          <thead>
            <tr>
              <th className="col-day">Hari</th>
              <th className="col-num">Jam</th>
              <th className="col-time">Waktu</th>
              {state.classes.map((c) => (
                <th key={c.id}>{c.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((dayName, day) => {
              const periods = state.daySchedules[day] ?? []
              const numbers = lessonNumbers(periods)
              return periods.map((period, rowIdx) => (
                <tr key={period.id} className={period.label !== null ? 'activity-row' : undefined}>
                  {rowIdx === 0 && (
                    <td className="col-day" rowSpan={periods.length}>
                      <span className="day-label">{dayName}</span>
                    </td>
                  )}
                  <td className="col-num">{period.label !== null ? '' : numbers.get(period.id)}</td>
                  <td className="col-time">
                    {period.start}–{period.end}
                  </td>
                  {period.label !== null ? (
                    <td className="activity-span" colSpan={state.classes.length}>
                      {period.label}
                    </td>
                  ) : (
                    state.classes.map((c) => {
                      const entry = entryAt.get(`${c.id}|${day}|${period.id}`)
                      return (
                        <td
                          key={c.id}
                          className="cell clickable"
                          onClick={() => setEditing({ classId: c.id, day, period })}
                        >
                          {entry ? (
                            <EntryCell
                              title={subjectsById.get(entry.subjectId)?.name ?? '?'}
                              subtitle={
                                entry.teacherId !== null
                                  ? teacherLabelOf(teachersById.get(entry.teacherId))
                                  : ''
                              }
                              color={subjectsById.get(entry.subjectId)?.color}
                              isConflict={conflicts.entryIds.has(entry.id)}
                            />
                          ) : (
                            <span className="empty-cell">+</span>
                          )}
                        </td>
                      )
                    })
                  )}
                </tr>
              ))
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <EntryDialog
          classId={editing.classId}
          day={editing.day}
          period={editing.period}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  )
}

function teacherLabelOf(teacher: { name: string; code: string } | undefined): string {
  return teacher ? teacherLabel(teacher) : '?'
}
