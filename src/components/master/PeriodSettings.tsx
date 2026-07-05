import { useState } from 'react'
import { lessonNumbers, type Period } from '../../types'
import { useSchedule } from '../../state/context'

export function PeriodSettings() {
  const { state, dispatch } = useSchedule()
  const [draft, setDraft] = useState<Period[]>(state.periods)
  const [savedPeriods, setSavedPeriods] = useState(state.periods)

  // Resync draft ketika jam pelajaran di state berubah (mis. setelah muat data contoh).
  if (savedPeriods !== state.periods) {
    setSavedPeriods(state.periods)
    setDraft(state.periods)
  }

  const numbers = lessonNumbers(draft)
  const dirty = JSON.stringify(draft) !== JSON.stringify(state.periods)

  function update(id: string, patch: Partial<Period>) {
    setDraft((d) => d.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  function addPeriod() {
    const last = draft[draft.length - 1]
    setDraft((d) => [
      ...d,
      {
        id: crypto.randomUUID(),
        start: last?.end ?? '07:00',
        end: last?.end ?? '07:45',
        isBreak: false,
      },
    ])
  }

  function removePeriod(id: string) {
    setDraft((d) => d.filter((p) => p.id !== id))
  }

  function save() {
    const lessonIds = new Set(draft.filter((p) => !p.isBreak).map((p) => p.id))
    const dropped = state.entries.filter((e) => !lessonIds.has(e.periodId)).length
    if (
      dropped > 0 &&
      !confirm(`Perubahan ini akan menghapus ${dropped} jadwal pada jam yang hilang. Lanjutkan?`)
    ) {
      return
    }
    dispatch({ type: 'SET_PERIODS', periods: draft })
  }

  return (
    <div className="card">
      <h3>Jam Pelajaran</h3>
      <table className="period-table">
        <thead>
          <tr>
            <th>Jam ke-</th>
            <th>Mulai</th>
            <th>Selesai</th>
            <th>Istirahat</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {draft.map((p) => (
            <tr key={p.id}>
              <td>{p.isBreak ? '—' : numbers.get(p.id)}</td>
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
                  type="checkbox"
                  checked={p.isBreak}
                  onChange={(e) => update(p.id, { isBreak: e.target.checked })}
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
      <div className="add-form">
        <button className="btn" onClick={addPeriod}>
          + Tambah slot
        </button>
        <span className="spacer" />
        {dirty && (
          <>
            <button className="btn" onClick={() => setDraft(state.periods)}>
              Batalkan
            </button>
            <button className="btn primary" onClick={save}>
              Simpan Jam Pelajaran
            </button>
          </>
        )}
      </div>
    </div>
  )
}
