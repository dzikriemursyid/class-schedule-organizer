import type { ReactNode } from 'react'
import { DAYS, lessonNumbers, type Period } from '../types'

interface ScheduleGridProps {
  periods: Period[]
  renderCell: (day: number, period: Period) => ReactNode
  onCellClick?: (day: number, period: Period) => void
}

export function ScheduleGrid({ periods, renderCell, onCellClick }: ScheduleGridProps) {
  const numbers = lessonNumbers(periods)

  return (
    <div className="grid-wrapper">
      <table className="schedule-grid">
        <thead>
          <tr>
            <th className="col-num">Jam ke-</th>
            <th className="col-time">Waktu</th>
            {DAYS.map((day) => (
              <th key={day}>{day}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map((period) =>
            period.isBreak ? (
              <tr key={period.id} className="break-row">
                <td />
                <td className="col-time">
                  {period.start}–{period.end}
                </td>
                <td colSpan={DAYS.length}>ISTIRAHAT</td>
              </tr>
            ) : (
              <tr key={period.id}>
                <td className="col-num">{numbers.get(period.id)}</td>
                <td className="col-time">
                  {period.start}–{period.end}
                </td>
                {DAYS.map((_, day) => (
                  <td
                    key={day}
                    className={onCellClick ? 'cell clickable' : 'cell'}
                    onClick={onCellClick ? () => onCellClick(day, period) : undefined}
                  >
                    {renderCell(day, period)}
                  </td>
                ))}
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  )
}
