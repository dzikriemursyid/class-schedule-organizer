import { useState } from 'react'
import {
  SUBJECT_COLORS,
  subjectClassIds,
  type ClassGroup,
  type Subject,
  type Teacher,
} from '../../types'
import { useSchedule } from '../../state/context'
import { PeriodSettings } from './PeriodSettings'
import { SubjectEditor } from './SubjectEditor'
import { TeacherAvailability } from './TeacherAvailability'

const DIST_SHORT: Record<string, string> = { sebar: 'Sebar', ganda: 'Ganda', blok: 'Blok' }

export function MasterDataPage() {
  return (
    <section className="page master">
      <div className="master-grid">
        <TeacherSection />
        <SubjectSection />
        <ClassSection />
        <PeriodSettings />
      </div>
    </section>
  )
}

function TeacherSection() {
  const { state, dispatch } = useSchedule()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')
  const [availTeacher, setAvailTeacher] = useState<Teacher | null>(null)

  function handleAdd() {
    // Kode opsional — cukup nama.
    if (!name.trim()) return
    dispatch({
      type: 'ADD_TEACHER',
      teacher: { id: crypto.randomUUID(), name: name.trim(), code: code.trim().toUpperCase() },
    })
    setName('')
    setCode('')
  }

  function handleRemove(id: string, teacherName: string) {
    const count = state.entries.filter((e) => e.teacherId === id).length
    const asg = state.assignments.filter((a) => a.teacherId === id).length
    const bits = [
      count > 0 ? `${count} jadwal` : '',
      asg > 0 ? `${asg} penugasan` : '',
    ].filter(Boolean)
    const extra = bits.length > 0 ? ` beserta ${bits.join(' & ')}` : ''
    if (!confirm(`Hapus guru ${teacherName}${extra}?`)) return
    dispatch({ type: 'REMOVE_TEACHER', id })
  }

  return (
    <div className="card">
      <h3>Guru</h3>
      <ul className="item-list">
        {state.teachers.map((t) =>
          editingId === t.id ? (
            <li key={t.id} className="item editing">
              <input value={editName} onChange={(e) => setEditName(e.target.value)} />
              <input
                className="input-code"
                placeholder="Kode (opsional)"
                value={editCode}
                maxLength={5}
                onChange={(e) => setEditCode(e.target.value)}
              />
              <button
                className="btn small primary"
                onClick={() => {
                  if (!editName.trim()) return
                  dispatch({
                    type: 'UPDATE_TEACHER',
                    teacher: { ...t, name: editName.trim(), code: editCode.trim().toUpperCase() },
                  })
                  setEditingId(null)
                }}
              >
                Simpan
              </button>
              <button className="btn small" onClick={() => setEditingId(null)}>
                Batal
              </button>
            </li>
          ) : (
            <li key={t.id} className="item">
              <span>
                {t.name}
                {t.code.trim() !== '' && <span className="badge">{t.code}</span>}
                {t.maxPerDay != null && <span className="tag">maks {t.maxPerDay}/hari</span>}
                {t.unavailable && t.unavailable.length > 0 && (
                  <span className="tag">{t.unavailable.length} jam blok</span>
                )}
              </span>
              <span className="item-actions">
                <button className="btn small" onClick={() => setAvailTeacher(t)}>
                  Ketersediaan
                </button>
                <button
                  className="btn small"
                  onClick={() => {
                    setEditingId(t.id)
                    setEditName(t.name)
                    setEditCode(t.code)
                  }}
                >
                  Ubah
                </button>
                <button className="btn small danger" onClick={() => handleRemove(t.id, t.name)}>
                  Hapus
                </button>
              </span>
            </li>
          ),
        )}
        {state.teachers.length === 0 && <li className="empty">Belum ada guru.</li>}
      </ul>
      <div className="add-form">
        <input
          placeholder="Nama guru"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <input
          className="input-code"
          placeholder="Kode (opsional)"
          value={code}
          maxLength={5}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button className="btn primary" onClick={handleAdd}>
          Tambah
        </button>
      </div>

      {availTeacher && (
        <TeacherAvailability teacher={availTeacher} onClose={() => setAvailTeacher(null)} />
      )}
    </div>
  )
}

function subjectSummary(s: Subject, allClasses: ClassGroup[]): string {
  const bits: string[] = []
  if (s.maxJpPerWeek != null) bits.push(`${s.maxJpPerWeek} JP`)
  if (s.distribution && s.distribution !== 'sebar') bits.push(DIST_SHORT[s.distribution])
  if (s.timePreference === 'pagi') bits.push('Pagi')
  const allowed = subjectClassIds(s, allClasses)
  if (allowed.length !== allClasses.length) bits.push(`${allowed.length} kelas`)
  return bits.join(' · ')
}

function SubjectSection() {
  const { state, dispatch } = useSchedule()
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(SUBJECT_COLORS[0])
  const [editing, setEditing] = useState<Subject | null>(null)

  function handleAdd() {
    if (!name.trim()) return
    dispatch({
      type: 'ADD_SUBJECT',
      subject: { id: crypto.randomUUID(), name: name.trim(), color },
    })
    setName('')
    // Warna berikutnya di palet biar mapel baru otomatis beda warna.
    const next = (SUBJECT_COLORS.indexOf(color as (typeof SUBJECT_COLORS)[number]) + 1) % SUBJECT_COLORS.length
    setColor(SUBJECT_COLORS[next])
  }

  function handleRemove(id: string, subjectName: string) {
    const count = state.entries.filter((e) => e.subjectId === id).length
    const asg = state.assignments.filter((a) => a.subjectId === id).length
    const bits = [count > 0 ? `${count} jadwal` : '', asg > 0 ? `${asg} penugasan` : ''].filter(
      Boolean,
    )
    const extra = bits.length > 0 ? ` beserta ${bits.join(' & ')}` : ''
    if (!confirm(`Hapus mapel ${subjectName}${extra}?`)) return
    dispatch({ type: 'REMOVE_SUBJECT', id })
  }

  return (
    <div className="card">
      <h3>Mata Pelajaran</h3>
      <ul className="item-list">
        {state.subjects.map((s) => {
          const summary = subjectSummary(s, state.classes)
          return (
            <li key={s.id} className="item">
              <span>
                <span className="dot" style={{ backgroundColor: s.color }} /> {s.name}
                {summary !== '' && <span className="tag">{summary}</span>}
              </span>
              <span className="item-actions">
                <button className="btn small" onClick={() => setEditing(s)}>
                  Ubah
                </button>
                <button className="btn small danger" onClick={() => handleRemove(s.id, s.name)}>
                  Hapus
                </button>
              </span>
            </li>
          )
        })}
        {state.subjects.length === 0 && <li className="empty">Belum ada mata pelajaran.</li>}
      </ul>
      <div className="add-form">
        <input
          placeholder="Nama mapel"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button className="btn primary" onClick={handleAdd}>
          Tambah
        </button>
      </div>
      <div className="color-row">
        {SUBJECT_COLORS.map((c) => (
          <button
            key={c}
            className={c === color ? 'swatch selected' : 'swatch'}
            style={{ backgroundColor: c }}
            onClick={() => setColor(c)}
            title="Warna mapel baru"
          />
        ))}
      </div>

      {editing && <SubjectEditor subject={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function ClassSection() {
  const { state, dispatch } = useSchedule()
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  function handleAdd() {
    if (!name.trim()) return
    dispatch({ type: 'ADD_CLASS', classGroup: { id: crypto.randomUUID(), name: name.trim() } })
    setName('')
  }

  function handleRemove(id: string, className: string) {
    const count = state.entries.filter((e) => e.classId === id).length
    const extra = count > 0 ? ` beserta ${count} jadwalnya` : ''
    if (!confirm(`Hapus kelas ${className}${extra}?`)) return
    dispatch({ type: 'REMOVE_CLASS', id })
  }

  return (
    <div className="card">
      <h3>Kelas</h3>
      <ul className="item-list">
        {state.classes.map((c) =>
          editingId === c.id ? (
            <li key={c.id} className="item editing">
              <input value={editName} onChange={(e) => setEditName(e.target.value)} />
              <button
                className="btn small primary"
                onClick={() => {
                  if (!editName.trim()) return
                  dispatch({ type: 'UPDATE_CLASS', classGroup: { id: c.id, name: editName.trim() } })
                  setEditingId(null)
                }}
              >
                Simpan
              </button>
              <button className="btn small" onClick={() => setEditingId(null)}>
                Batal
              </button>
            </li>
          ) : (
            <li key={c.id} className="item">
              <span>{c.name}</span>
              <span className="item-actions">
                <button
                  className="btn small"
                  onClick={() => {
                    setEditingId(c.id)
                    setEditName(c.name)
                  }}
                >
                  Ubah
                </button>
                <button className="btn small danger" onClick={() => handleRemove(c.id, c.name)}>
                  Hapus
                </button>
              </span>
            </li>
          ),
        )}
        {state.classes.length === 0 && <li className="empty">Belum ada kelas.</li>}
      </ul>
      <div className="add-form">
        <input
          placeholder="Nama kelas, mis. 7A"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button className="btn primary" onClick={handleAdd}>
          Tambah
        </button>
      </div>
    </div>
  )
}
