import { useMemo, useState } from 'react'
import { DAYS, lessonNumbers, teacherLabel, type Period, type SlotAssignment } from '../types'
import { useSchedule } from '../state/context'

interface EntryDialogProps {
  classId: string
  day: number
  period: Period
  /** Guru default saat mengisi sel kosong (mis. dari tab per Guru). */
  defaultTeacherId?: string
  onClose: () => void
}

export function EntryDialog({ classId, day, period, defaultTeacherId, onClose }: EntryDialogProps) {
  const { state, dispatch } = useSchedule()

  const existing = state.entries.find(
    (e) => e.classId === classId && e.day === day && e.periodId === period.id,
  )
  const [subjectId, setSubjectId] = useState(existing?.subjectId ?? '')
  const [teacherId, setTeacherId] = useState(
    existing ? (existing.teacherId ?? '') : (defaultTeacherId ?? ''),
  )
  const [span, setSpan] = useState(1)

  const className = state.classes.find((c) => c.id === classId)?.name ?? '?'
  const dayPeriods = useMemo(() => state.daySchedules[day] ?? [], [state.daySchedules, day])
  const numbers = lessonNumbers(dayPeriods)

  // Jam pelajaran berikutnya di hari yang sama (slot kegiatan dilewati)
  // untuk opsi "N jam berturut-turut".
  const followingPeriods = useMemo(() => {
    const start = dayPeriods.findIndex((p) => p.id === period.id)
    return dayPeriods.slice(start).filter((p) => p.label === null)
  }, [dayPeriods, period.id])

  // Guru yang sudah mengajar kelas lain di slot ini.
  const busyTeachers = useMemo(() => {
    const map = new Map<string, string>()
    for (const e of state.entries) {
      if (e.teacherId === null) continue
      if (e.day !== day || e.periodId !== period.id || e.classId === classId) continue
      const cls = state.classes.find((c) => c.id === e.classId)
      map.set(e.teacherId, cls?.name ?? '?')
    }
    return map
  }, [state.entries, state.classes, day, period.id, classId])

  const canSave = subjectId !== ''

  function handleSave() {
    if (!canSave) return
    const slots: SlotAssignment[] = followingPeriods.slice(0, span).map((p) => ({
      day,
      periodId: p.id,
      classId,
      subjectId,
      teacherId: teacherId === '' ? null : teacherId,
    }))
    dispatch({ type: 'SET_SLOTS', slots })
    onClose()
  }

  function handleDelete() {
    dispatch({ type: 'CLEAR_SLOT', day, periodId: period.id, classId })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>
          Kelas {className} · {DAYS[day]} · Jam ke-{numbers.get(period.id)} ({period.start}–
          {period.end})
        </h3>

        <label className="field">
          <span>Mata pelajaran</span>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">— pilih mapel —</option>
            {state.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Guru pengampu</span>
          <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            <option value="">— tanpa guru (mis. P5BK) —</option>
            {state.teachers.map((t) => {
              const busyIn = busyTeachers.get(t.id)
              return (
                <option key={t.id} value={t.id}>
                  {teacherLabel(t)}
                  {busyIn ? ` — ⚠ sudah mengajar ${busyIn}` : ''}
                </option>
              )
            })}
          </select>
        </label>

        {teacherId !== '' && busyTeachers.has(teacherId) && (
          <p className="warning-text">
            ⚠ Guru ini sudah mengajar kelas {busyTeachers.get(teacherId)} pada jam yang sama.
            Menyimpan akan menimbulkan bentrok.
          </p>
        )}

        <label className="field">
          <span>Jumlah jam berturut-turut</span>
          <select value={span} onChange={(e) => setSpan(Number(e.target.value))}>
            {followingPeriods.map((_, i) => (
              <option key={i} value={i + 1}>
                {i + 1} jam
              </option>
            ))}
          </select>
        </label>

        <div className="modal-actions">
          {existing && (
            <button className="btn danger" onClick={handleDelete}>
              Hapus
            </button>
          )}
          <span className="spacer" />
          <button className="btn" onClick={onClose}>
            Batal
          </button>
          <button className="btn primary" onClick={handleSave} disabled={!canSave}>
            Simpan
          </button>
        </div>
      </div>
    </div>
  )
}
