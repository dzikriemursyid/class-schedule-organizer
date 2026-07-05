import { useState } from 'react'
import { SUBJECT_COLORS, type Distribution, type Subject, type TimePreference } from '../../types'
import { useSchedule } from '../../state/context'

interface SubjectEditorProps {
  subject: Subject
  onClose: () => void
}

const DIST_LABELS: Record<Distribution, string> = {
  sebar: 'Sebar (1 JP/hari, tersebar)',
  ganda: 'Ganda (2 JP berurutan)',
  blok: 'Blok (semua JP sekaligus, mis. praktik Lab)',
}

export function SubjectEditor({ subject, onClose }: SubjectEditorProps) {
  const { state, dispatch } = useSchedule()
  const [name, setName] = useState(subject.name)
  const [color, setColor] = useState(subject.color)
  const [maxJp, setMaxJp] = useState(subject.maxJpPerWeek?.toString() ?? '')
  const [distribution, setDistribution] = useState<Distribution>(subject.distribution ?? 'sebar')
  const [timePreference, setTimePreference] = useState<TimePreference>(
    subject.timePreference ?? 'bebas',
  )
  // classIds kosong/undefined = semua kelas.
  const [classIds, setClassIds] = useState<string[]>(subject.classIds ?? [])

  const allSelected = classIds.length === 0 || classIds.length === state.classes.length

  function toggleClass(id: string) {
    setClassIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function handleSave() {
    if (!name.trim()) return
    const jp = Number(maxJp)
    dispatch({
      type: 'UPDATE_SUBJECT',
      subject: {
        ...subject,
        name: name.trim(),
        color,
        maxJpPerWeek: maxJp.trim() !== '' && jp > 0 ? jp : undefined,
        distribution,
        timePreference,
        // Simpan undefined bila semua kelas dipilih (berlaku umum).
        classIds:
          classIds.length === 0 || classIds.length === state.classes.length ? undefined : classIds,
      },
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Setting Mapel</h3>

        <label className="field">
          <span>Nama mapel</span>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label className="field">
          <span>Warna</span>
          <span className="color-row">
            {SUBJECT_COLORS.map((c) => (
              <button
                key={c}
                className={c === color ? 'swatch selected' : 'swatch'}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </span>
        </label>

        <label className="field">
          <span>Maks JP / minggu (per kelas)</span>
          <input
            type="number"
            min={0}
            placeholder="mis. 4"
            value={maxJp}
            onChange={(e) => setMaxJp(e.target.value)}
          />
        </label>

        <label className="field">
          <span>Distribusi jam</span>
          <select
            value={distribution}
            onChange={(e) => setDistribution(e.target.value as Distribution)}
          >
            {(Object.keys(DIST_LABELS) as Distribution[]).map((d) => (
              <option key={d} value={d}>
                {DIST_LABELS[d]}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Waktu</span>
          <select
            value={timePreference}
            onChange={(e) => setTimePreference(e.target.value as TimePreference)}
          >
            <option value="bebas">Bebas</option>
            <option value="pagi">Harus pagi (jam awal)</option>
          </select>
        </label>

        <div className="field">
          <span>Kelas yang boleh mengambil {allSelected ? '(semua)' : `(${classIds.length})`}</span>
          <div className="chip-toggles">
            {state.classes.map((c) => (
              <button
                key={c.id}
                className={classIds.includes(c.id) ? 'chip on' : 'chip'}
                onClick={() => toggleClass(c.id)}
              >
                {c.name}
              </button>
            ))}
            {state.classes.length === 0 && <span className="hint">Belum ada kelas.</span>}
          </div>
          <span className="hint">Kosongkan = berlaku untuk semua kelas.</span>
        </div>

        <div className="modal-actions">
          <span className="spacer" />
          <button className="btn" onClick={onClose}>
            Batal
          </button>
          <button className="btn primary" onClick={handleSave} disabled={!name.trim()}>
            Simpan
          </button>
        </div>
      </div>
    </div>
  )
}
