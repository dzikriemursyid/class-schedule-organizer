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
      // Sel bentrok diwarnai merah lewat CSS (.conflict); warna mapel diabaikan
      // supaya merah hanya berarti bentrok.
      style={isConflict ? undefined : { backgroundColor: color ?? '#e2e8f0' }}
      title={isConflict ? 'Bentrok: guru mengajar di kelas lain pada jam yang sama' : undefined}
    >
      <span className="entry-title">{title}</span>
      {subtitle !== '' && <span className="entry-subtitle">{subtitle}</span>}
    </div>
  )
}
