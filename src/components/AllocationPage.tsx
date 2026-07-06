import { useEffect, useMemo, useRef, useState } from 'react'
import { subjectClassIds, teacherLabel, type Assignment } from '../types'
import { useSchedule } from '../state/context'
import { allocate, type AllocationResult } from '../utils/allocate'

interface AllocationPageProps {
  onGoMaster: () => void
}

export function AllocationPage({ onGoMaster }: AllocationPageProps) {
  const { state, dispatch } = useSchedule()

  const subjectsById = useMemo(() => new Map(state.subjects.map((s) => [s.id, s])), [state.subjects])
  const teachersById = useMemo(() => new Map(state.teachers.map((t) => [t.id, t])), [state.teachers])
  const classesById = useMemo(() => new Map(state.classes.map((c) => [c.id, c])), [state.classes])

  const [askMode, setAskMode] = useState(false)
  const [result, setResult] = useState<{ res: AllocationResult; mode: 'fill' | 'overwrite' } | null>(
    null,
  )
  const [applied, setApplied] = useState<string | null>(null)

  // Total slot jam pelajaran per kelas (sama untuk semua kelas).
  const lessonSlotsPerClass = useMemo(
    () => state.daySchedules.reduce((sum, day) => sum + day.filter((p) => p.label === null).length, 0),
    [state.daySchedules],
  )

  const jpByClass = new Map<string, number>()
  const jpByTeacher = new Map<string, number>()
  for (const a of state.assignments) {
    jpByClass.set(a.classId, (jpByClass.get(a.classId) ?? 0) + a.jp)
    jpByTeacher.set(a.teacherId, (jpByTeacher.get(a.teacherId) ?? 0) + a.jp)
  }
  // Target kurikulum per kelas = Σ maks JP mapel yang berlaku untuk kelas itu.
  const targetByClass = new Map<string, number>()
  for (const c of state.classes) {
    let target = 0
    for (const s of state.subjects) {
      if (subjectClassIds(s, state.classes).includes(c.id)) target += s.maxJpPerWeek ?? 0
    }
    targetByClass.set(c.id, target)
  }

  function runAllocation(mode: 'fill' | 'overwrite') {
    setAskMode(false)
    setApplied(null)
    setResult({ res: allocate(state, { mode }), mode })
  }

  function applyResult() {
    if (!result) return
    dispatch({ type: 'APPLY_ALLOCATION', entries: result.res.entries, mode: result.mode })
    setApplied(
      `${result.res.report.placed} JP diterapkan (${result.mode === 'overwrite' ? 'timpa semua' : 'isi slot kosong'}). Buka tab Keseluruhan untuk melihat.`,
    )
    setResult(null)
  }

  if (state.classes.length === 0 || state.teachers.length === 0 || state.subjects.length === 0) {
    return (
      <div className="empty-state">
        <p>Lengkapi guru, mapel, dan kelas dulu di Data Master.</p>
        <button className="btn primary" onClick={onGoMaster}>
          Ke Data Master
        </button>
      </div>
    )
  }

  return (
    <section className="page">
      <div className="page-header no-print">
        <h2 className="print-title">Alokasi Otomatis</h2>
        <p className="hint">
          Isi penugasan (siapa mengajar apa, berapa JP), lalu sistem menata waktunya tanpa bentrok.
        </p>
      </div>

      {applied && <div className="success-banner">✓ {applied}</div>}

      <AssignmentEditor />

      {/* Ringkasan beban */}
      <div className="alloc-summary">
        <div className="card">
          <h3>Beban per Kelas</h3>
          <div className="chip-toggles">
            {state.classes.map((c) => {
              const jp = jpByClass.get(c.id) ?? 0
              const target = targetByClass.get(c.id) ?? 0
              const over = jp > lessonSlotsPerClass
              return (
                <span key={c.id} className={over ? 'load-chip over' : 'load-chip'}>
                  {c.name}: {jp}
                  {target > 0 ? `/${target}` : ''} JP
                </span>
              )
            })}
          </div>
          <p className="hint">Kapasitas {lessonSlotsPerClass} slot/kelas per minggu.</p>
        </div>
        <div className="card">
          <h3>Beban per Guru</h3>
          <div className="chip-toggles">
            {state.teachers
              .filter((t) => (jpByTeacher.get(t.id) ?? 0) > 0)
              .map((t) => {
                const jp = jpByTeacher.get(t.id) ?? 0
                const cap = lessonSlotsPerClass - (t.unavailable?.length ?? 0)
                return (
                  <span key={t.id} className={jp > cap ? 'load-chip over' : 'load-chip'}>
                    {teacherLabel(t)}: {jp} JP
                  </span>
                )
              })}
            {state.assignments.length === 0 && <span className="hint">Belum ada penugasan.</span>}
          </div>
        </div>
      </div>

      <div className="toolbar alloc-actions">
        <button
          className="btn primary"
          onClick={() => setAskMode(true)}
          disabled={state.assignments.length === 0}
          title={state.assignments.length === 0 ? 'Tambah penugasan dulu' : undefined}
        >
          ▶ Jalankan Alokasi
        </button>
      </div>

      {askMode && (
        <ModeDialog onPick={runAllocation} onClose={() => setAskMode(false)} />
      )}

      {result && (
        <ResultPanel
          result={result.res}
          subjectsById={subjectsById}
          teachersById={teachersById}
          classesById={classesById}
          onApply={applyResult}
          onCancel={() => setResult(null)}
        />
      )}
    </section>
  )
}

function AssignmentEditor() {
  const { state, dispatch } = useSchedule()
  const [subjectId, setSubjectId] = useState('')
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([])
  const [teacherId, setTeacherId] = useState('')
  const [jp, setJp] = useState('')
  const [classDropdownOpen, setClassDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!classDropdownOpen) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setClassDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [classDropdownOpen])

  const subject = state.subjects.find((s) => s.id === subjectId)
  const allowedClasses = subject
    ? state.classes.filter((c) => subjectClassIds(subject, state.classes).includes(c.id))
    : state.classes
  const maxJp = subject?.maxJpPerWeek

  const duplicateIds = new Set(
    state.assignments
      .filter((a) => a.subjectId === subjectId)
      .map((a) => a.classId),
  )
  const hasDuplicate = selectedClassIds.some((id) => duplicateIds.has(id))
  const jpNum = Number(jp)
  const jpValid = jp.trim() !== '' && jpNum > 0 && (maxJp == null || jpNum <= maxJp)
  const canAdd =
    subjectId !== '' && selectedClassIds.length > 0 && teacherId !== '' && jpValid && !hasDuplicate

  function pickSubject(id: string) {
    setSubjectId(id)
    setSelectedClassIds([])
    const s = state.subjects.find((x) => x.id === id)
    setJp(s?.maxJpPerWeek != null ? String(s.maxJpPerWeek) : '')
  }

  function toggleClass(classId: string) {
    setSelectedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId],
    )
  }

  function selectAllClasses() {
    const allIds = allowedClasses.map((c) => c.id)
    setSelectedClassIds(allIds)
  }

  function clearAllClasses() {
    setSelectedClassIds([])
  }

  function handleAdd() {
    if (!canAdd) return
    for (const cId of selectedClassIds) {
      if (duplicateIds.has(cId)) continue
      dispatch({
        type: 'ADD_ASSIGNMENT',
        assignment: { id: crypto.randomUUID(), subjectId, classId: cId, teacherId, jp: jpNum },
      })
    }
    setSelectedClassIds([])
    setTeacherId('')
    setJp(maxJp != null ? String(maxJp) : '')
  }

  // Urutkan penugasan berdasarkan nama kelas lalu mapel.
  const rows = [...state.assignments].sort((a, b) => {
    const ca = state.classes.find((c) => c.id === a.classId)?.name ?? ''
    const cb = state.classes.find((c) => c.id === b.classId)?.name ?? ''
    if (ca !== cb) return ca.localeCompare(cb)
    const sa = state.subjects.find((s) => s.id === a.subjectId)?.name ?? ''
    const sb = state.subjects.find((s) => s.id === b.subjectId)?.name ?? ''
    return sa.localeCompare(sb)
  })

  function updateRow(a: Assignment, patch: Partial<Assignment>) {
    dispatch({ type: 'UPDATE_ASSIGNMENT', assignment: { ...a, ...patch } })
  }

  return (
    <div className="card">
      <h3>Penugasan Mengajar</h3>
      <div className="table-scroll">
        <table className="assign-table">
          <thead>
            <tr>
              <th>Mapel</th>
              <th>Kelas</th>
              <th>Guru</th>
              <th>JP</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const s = state.subjects.find((x) => x.id === a.subjectId)
              const cls = state.classes.find((x) => x.id === a.classId)
              const overMax = s?.maxJpPerWeek != null && a.jp > s.maxJpPerWeek
              return (
                <tr key={a.id}>
                  <td>
                    <span className="dot" style={{ backgroundColor: s?.color ?? '#e2e8f0' }} />{' '}
                    {s?.name ?? '?'}
                  </td>
                  <td>{cls?.name ?? '?'}</td>
                  <td>
                    <select
                      value={a.teacherId}
                      onChange={(e) => updateRow(a, { teacherId: e.target.value })}
                    >
                      {state.teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {teacherLabel(t)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      className={overMax ? 'jp-input over' : 'jp-input'}
                      value={a.jp}
                      onChange={(e) => updateRow(a, { jp: Math.max(1, Number(e.target.value) || 1) })}
                      title={overMax ? `Melebihi maks ${s?.maxJpPerWeek} JP mapel ini` : undefined}
                    />
                  </td>
                  <td>
                    <button
                      className="btn small danger"
                      onClick={() => dispatch({ type: 'REMOVE_ASSIGNMENT', id: a.id })}
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  Belum ada penugasan. Tambah di bawah.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="add-form assign-add">
        <select value={subjectId} onChange={(e) => pickSubject(e.target.value)}>
          <option value="">— mapel —</option>
          {state.subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <div className="class-multiselect" ref={dropdownRef}>
          <button
            type="button"
            className="class-multiselect-toggle"
            onClick={() => setClassDropdownOpen((v) => !v)}
            disabled={!subject}
          >
            {selectedClassIds.length === 0
              ? '— kelas —'
              : selectedClassIds.length === allowedClasses.length
                ? `Semua (${allowedClasses.length})`
                : `${selectedClassIds.length} kelas`}
            <span className="caret">▾</span>
          </button>
          {classDropdownOpen && (
            <div className="class-multiselect-dropdown">
              <div className="class-multiselect-actions">
                <button type="button" className="btn small" onClick={selectAllClasses}>
                  Semua
                </button>
                <button type="button" className="btn small" onClick={clearAllClasses}>
                  Hapus
                </button>
              </div>
              {allowedClasses.map((c) => (
                <label key={c.id} className="class-check-item">
                  <input
                    type="checkbox"
                    checked={selectedClassIds.includes(c.id)}
                    onChange={() => toggleClass(c.id)}
                  />
                  <span>{c.name}</span>
                  {duplicateIds.has(c.id) && <span className="hint warn">✗</span>}
                </label>
              ))}
            </div>
          )}
        </div>
        <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
          <option value="">— guru —</option>
          {state.teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {teacherLabel(t)}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          max={maxJp}
          className="jp-input"
          placeholder="JP"
          value={jp}
          onChange={(e) => setJp(e.target.value)}
        />
        <button className="btn primary" onClick={handleAdd} disabled={!canAdd}>
          Tambah
        </button>
      </div>
      {hasDuplicate && subjectId !== '' && selectedClassIds.length > 0 && (
        <p className="hint warn">Penugasan mapel + kelas yang ditandai ✗ sudah ada.</p>
      )}
      {subjectId !== '' && jp.trim() !== '' && maxJp != null && jpNum > maxJp && (
        <p className="hint warn">JP melebihi maks {maxJp} untuk mapel ini.</p>
      )}
    </div>
  )
}

function ModeDialog({
  onPick,
  onClose,
}: {
  onPick: (mode: 'fill' | 'overwrite') => void
  onClose: () => void
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Jalankan alokasi bagaimana?</h3>
        <div className="mode-options">
          <button className="btn" onClick={() => onPick('fill')}>
            <strong>Isi slot kosong saja</strong>
            <span className="hint">Jadwal yang sudah ada dipertahankan; hanya slot kosong diisi.</span>
          </button>
          <button className="btn" onClick={() => onPick('overwrite')}>
            <strong>Timpa semua</strong>
            <span className="hint">Hapus semua jadwal, susun ulang dari nol berdasar penugasan.</span>
          </button>
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

function ResultPanel({
  result,
  subjectsById,
  teachersById,
  classesById,
  onApply,
  onCancel,
}: {
  result: AllocationResult
  subjectsById: Map<string, { name: string }>
  teachersById: Map<string, { name: string; code: string }>
  classesById: Map<string, { name: string }>
  onApply: () => void
  onCancel: () => void
}) {
  const { report } = result
  const full = report.unplaced.length === 0
  return (
    <div className="card result-panel">
      <h3>Hasil Alokasi</h3>
      <p className={full ? 'result-ok' : 'result-warn'}>
        {full ? '✓ ' : '⚠ '}
        {report.placed} dari {report.requested} JP berhasil ditempatkan
        {full ? ' (semua penugasan masuk).' : `, ${report.requested - report.placed} JP tidak muat.`}
      </p>

      {report.hasConflicts && (
        <p className="result-warn">⚠ Terdeteksi bentrok pada hasil — laporkan bug ini.</p>
      )}

      {report.warnings.length > 0 && (
        <div className="result-block">
          <strong>Peringatan kapasitas:</strong>
          <ul>
            {report.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {report.unplaced.length > 0 && (
        <div className="result-block">
          <strong>Gagal ditempatkan:</strong>
          <ul>
            {report.unplaced.map((u, i) => (
              <li key={i}>
                {subjectsById.get(u.subjectId)?.name ?? '?'} — {classesById.get(u.classId)?.name ?? '?'}{' '}
                (guru {teacherLabel(teachersById.get(u.teacherId) ?? { name: '?', code: '' })}):{' '}
                {u.jpNeeded} JP — {u.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="modal-actions">
        <span className="spacer" />
        <button className="btn" onClick={onCancel}>
          Batal
        </button>
        <button className="btn primary" onClick={onApply}>
          Terapkan ke Jadwal
        </button>
      </div>
    </div>
  )
}
