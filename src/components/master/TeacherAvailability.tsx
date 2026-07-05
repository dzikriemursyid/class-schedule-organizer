import { useState } from 'react'
import { DAYS, lessonNumbers, teacherLabel, type Teacher } from '../../types'
import { useSchedule } from '../../state/context'

interface TeacherAvailabilityProps {
  teacher: Teacher
  onClose: () => void
}

const slotKey = (day: number, periodId: string) => `${day}|${periodId}`

export function TeacherAvailability({ teacher, onClose }: TeacherAvailabilityProps) {
  const { state, dispatch } = useSchedule()
  const [unavailable, setUnavailable] = useState<Set<string>>(new Set(teacher.unavailable ?? []))
  const [maxPerDay, setMaxPerDay] = useState(teacher.maxPerDay?.toString() ?? '')

  function toggle(day: number, periodId: string) {
    setUnavailable((prev) => {
      const next = new Set(prev)
      const key = slotKey(day, periodId)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleWholeDay(day: number, lessonPeriodIds: string[]) {
    setUnavailable((prev) => {
      const next = new Set(prev)
      const allOff = lessonPeriodIds.every((id) => next.has(slotKey(day, id)))
      for (const id of lessonPeriodIds) {
        const key = slotKey(day, id)
        if (allOff) next.delete(key)
        else next.add(key)
      }
      return next
    })
  }

  function handleSave() {
    const jp = Number(maxPerDay)
    dispatch({
      type: 'UPDATE_TEACHER',
      teacher: {
        ...teacher,
        maxPerDay: maxPerDay.trim() !== '' && jp > 0 ? jp : undefined,
        unavailable: unavailable.size > 0 ? [...unavailable] : undefined,
      },
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <h3>Ketersediaan — {teacherLabel(teacher)}</h3>

        <label className="field">
          <span>Maks JP mengajar / hari</span>
          <input
            type="number"
            min={0}
            placeholder="mis. 8 (kosong = tanpa batas)"
            value={maxPerDay}
            onChange={(e) => setMaxPerDay(e.target.value)}
          />
        </label>

        <p className="hint">Centang jam yang guru TIDAK bisa mengajar.</p>
        <div className="avail-grid">
          {DAYS.map((dayName, day) => {
            const lessons = (state.daySchedules[day] ?? []).filter((p) => p.label === null)
            const numbers = lessonNumbers(state.daySchedules[day] ?? [])
            return (
              <div key={dayName} className="avail-day">
                <button
                  className="btn small avail-dayname"
                  onClick={() => toggleWholeDay(day, lessons.map((p) => p.id))}
                  title="Klik untuk tandai/lepas seluruh hari"
                >
                  {dayName}
                </button>
                <div className="avail-slots">
                  {lessons.map((p) => {
                    const off = unavailable.has(slotKey(day, p.id))
                    return (
                      <button
                        key={p.id}
                        className={off ? 'avail-slot off' : 'avail-slot'}
                        onClick={() => toggle(day, p.id)}
                        title={`${p.start}–${p.end}`}
                      >
                        {numbers.get(p.id)}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <div className="modal-actions">
          <span className="spacer" />
          <button className="btn" onClick={onClose}>
            Batal
          </button>
          <button className="btn primary" onClick={handleSave}>
            Simpan
          </button>
        </div>
      </div>
    </div>
  )
}
