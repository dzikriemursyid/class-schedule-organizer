import { useState } from 'react'
import { DAYS, lessonNumbers, type Period } from '../../types'
import { useSchedule } from '../../state/context'

export function PeriodSettings() {
  const { state, dispatch } = useSchedule()
  const [draft, setDraft] = useState<Period[][]>(state.daySchedules)
  const [savedSchedules, setSavedSchedules] = useState(state.daySchedules)
  const [activeDay, setActiveDay] = useState(0)
  const [copyFrom, setCopyFrom] = useState(1)

  // Resync draft ketika jadwal jam di state berubah (mis. setelah muat data contoh).
  if (savedSchedules !== state.daySchedules) {
    setSavedSchedules(state.daySchedules)
    setDraft(state.daySchedules)
  }

  const dayPeriods = draft[activeDay] ?? []
  const numbers = lessonNumbers(dayPeriods)
  const dirty = JSON.stringify(draft) !== JSON.stringify(state.daySchedules)

  function updateDay(day: number, periods: Period[]) {
    setDraft((d) => d.map((p, i) => (i === day ? periods : p)))
  }

  function update(id: string, patch: Partial<Period>) {
    updateDay(
      activeDay,
      dayPeriods.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    )
  }

  function addPeriod() {
    const last = dayPeriods[dayPeriods.length - 1]
    updateDay(activeDay, [
      ...dayPeriods,
      {
        id: crypto.randomUUID(),
        start: last?.end ?? '07:00',
        end: last?.end ?? '07:45',
        label: null,
      },
    ])
  }

  function removePeriod(id: string) {
    updateDay(
      activeDay,
      dayPeriods.filter((p) => p.id !== id),
    )
  }

  function copyDay() {
    updateDay(activeDay, draft[copyFrom].map((p) => ({ ...p })))
  }

  function save() {
    const lessonIdsPerDay = draft.map(
      (periods) => new Set(periods.filter((p) => p.label === null).map((p) => p.id)),
    )
    const dropped = state.entries.filter((e) => !lessonIdsPerDay[e.day]?.has(e.periodId)).length
    if (
      dropped > 0 &&
      !confirm(`Perubahan ini akan menghapus ${dropped} jadwal pada jam yang hilang. Lanjutkan?`)
    ) {
      return
    }
    dispatch({ type: 'SET_DAY_SCHEDULES', daySchedules: draft })
  }

  return (
    <div className="card card-wide">
      <h3>Jam Pelajaran per Hari</h3>
      <div className="day-tabs">
        {DAYS.map((name, day) => (
          <button
            key={name}
            className={day === activeDay ? 'day-tab active' : 'day-tab'}
            onClick={() => setActiveDay(day)}
          >
            {name}
          </button>
        ))}
      </div>
      <p className="hint">Kosongkan kolom "Kegiatan" untuk jam pelajaran biasa.</p>
      <div className="table-scroll">
        <table className="period-table">
        <thead>
          <tr>
            <th>Jam ke-</th>
            <th>Mulai</th>
            <th>Selesai</th>
            <th>Kegiatan</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {dayPeriods.map((p) => (
            <tr key={p.id}>
              <td>{p.label !== null ? '—' : numbers.get(p.id)}</td>
              <td>
                <input
                  type="time"
                  value={p.start}
                  onChange={(e) => update(p.id, { start: e.target.value })}
                />
              </td>
              <td>
                <input
                  type="time"
                  value={p.end}
                  onChange={(e) => update(p.id, { end: e.target.value })}
                />
              </td>
              <td>
                <input
                  type="text"
                  className="input-label"
                  placeholder="mis. Upacara"
                  value={p.label ?? ''}
                  onChange={(e) => update(p.id, { label: e.target.value || null })}
                />
              </td>
              <td>
                <button className="btn small danger" onClick={() => removePeriod(p.id)}>
                  Hapus
                </button>
              </td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
      <div className="add-form">
        <button className="btn" onClick={addPeriod}>
          + Tambah slot
        </button>
        <select
          value={copyFrom}
          onChange={(e) => setCopyFrom(Number(e.target.value))}
          title="Sumber salinan susunan jam"
        >
          {DAYS.map((name, day) => (
            <option key={name} value={day} disabled={day === activeDay}>
              dari {name}
            </option>
          ))}
        </select>
        <button
          className="btn"
          onClick={copyDay}
          disabled={copyFrom === activeDay}
          title={`Salin susunan jam ${DAYS[copyFrom]} ke ${DAYS[activeDay]}`}
        >
          Salin
        </button>
      </div>
      {dirty && (
        <div className="add-form save-row">
          <span className="spacer" />
          <button className="btn" onClick={() => setDraft(state.daySchedules)}>
            Batalkan
          </button>
          <button className="btn primary" onClick={save}>
            Simpan Jam Pelajaran
          </button>
        </div>
      )}
    </div>
  )
}
