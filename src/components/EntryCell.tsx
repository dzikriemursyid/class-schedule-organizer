interface EntryCellProps {
  title: string
  subtitle: string
  color?: string
  isConflict?: boolean
}

export function EntryCell({ title, subtitle, color, isConflict }: EntryCellProps) {
  return (
    <div
      className={isConflict ? 'entry-chip conflict' : 'entry-chip'}
      style={{ backgroundColor: color ?? '#e2e8f0' }}
      title={isConflict ? 'Bentrok: guru mengajar di kelas lain pada jam ini' : undefined}
    >
      <span className="entry-title">{title}</span>
      <span className="entry-subtitle">{subtitle}</span>
    </div>
  )
}
