import { useState } from 'react'
import { useSchedule } from './state/context'
import { ScheduleProvider } from './state/ScheduleProvider'
import { buildSeedState } from './state/seed'
import { exportToExcel } from './utils/exportExcel'
import { ClassSchedulePage } from './components/ClassSchedulePage'
import { TeacherSchedulePage } from './components/TeacherSchedulePage'
import { MasterDataPage } from './components/master/MasterDataPage'
import { ConflictBanner } from './components/ConflictBanner'

type Tab = 'class' | 'teacher' | 'master'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'class', label: 'Jadwal per Kelas' },
  { id: 'teacher', label: 'Jadwal per Guru' },
  { id: 'master', label: 'Data Master' },
]

export default function App() {
  return (
    <ScheduleProvider>
      <Main />
    </ScheduleProvider>
  )
}

function Main() {
  const { state, dispatch } = useSchedule()
  const [tab, setTab] = useState<Tab>('class')
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null)

  const classId = state.classes.some((c) => c.id === selectedClassId)
    ? selectedClassId!
    : state.classes[0]?.id
  const teacherId = state.teachers.some((t) => t.id === selectedTeacherId)
    ? selectedTeacherId!
    : state.teachers[0]?.id

  const isEmpty =
    state.teachers.length === 0 && state.subjects.length === 0 && state.classes.length === 0

  function loadSeed() {
    if (!isEmpty && !confirm('Data yang ada akan diganti dengan data contoh. Lanjutkan?')) return
    dispatch({ type: 'LOAD_STATE', state: buildSeedState() })
  }

  return (
    <div className="app">
      <header className="app-header no-print">
        <div>
          <h1>Penyusun Jadwal Pelajaran</h1>
          <p className="subtitle">Data tersimpan otomatis di browser ini.</p>
        </div>
        <div className="toolbar">
          <button className="btn" onClick={loadSeed}>
            Muat Data Contoh
          </button>
          <button
            className="btn"
            onClick={() => window.print()}
            disabled={tab === 'master'}
            title="Cetak grid yang sedang tampil (bisa disimpan sebagai PDF)"
          >
            🖨 Cetak / PDF
          </button>
          <button
            className="btn primary"
            onClick={() => void exportToExcel(state)}
            disabled={state.classes.length === 0 && state.teachers.length === 0}
            title="Unduh .xlsx berisi satu sheet per kelas dan per guru"
          >
            ⬇ Export Excel
          </button>
        </div>
      </header>

      <div className="no-print">
        <ConflictBanner
          onShowTeacher={(id) => {
            setSelectedTeacherId(id)
            setTab('teacher')
          }}
        />
      </div>

      <nav className="tabs no-print">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'tab active' : 'tab'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        {tab === 'class' &&
          (classId ? (
            <ClassSchedulePage classId={classId} onSelectClass={setSelectedClassId} />
          ) : (
            <EmptyState
              message="Belum ada kelas."
              onLoadSeed={loadSeed}
              onGoMaster={() => setTab('master')}
            />
          ))}
        {tab === 'teacher' &&
          (teacherId ? (
            <TeacherSchedulePage teacherId={teacherId} onSelectTeacher={setSelectedTeacherId} />
          ) : (
            <EmptyState
              message="Belum ada guru."
              onLoadSeed={loadSeed}
              onGoMaster={() => setTab('master')}
            />
          ))}
        {tab === 'master' && <MasterDataPage />}
      </main>
    </div>
  )
}

function EmptyState({
  message,
  onLoadSeed,
  onGoMaster,
}: {
  message: string
  onLoadSeed: () => void
  onGoMaster: () => void
}) {
  return (
    <div className="empty-state">
      <p>{message}</p>
      <div className="toolbar">
        <button className="btn primary" onClick={onGoMaster}>
          Isi Data Master
        </button>
        <button className="btn" onClick={onLoadSeed}>
          Muat Data Contoh
        </button>
      </div>
    </div>
  )
}
