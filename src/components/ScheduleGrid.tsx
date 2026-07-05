import type { ReactNode } from 'react'
import { DAYS, lessonNumbers, type Period } from '../types'

interface ScheduleGridProps {
  daySchedules: Period[][]
  renderCell: (day: number, period: Period) => ReactNode
  onCellClick?: (day: number, period: Period) => void
}

/**
 * Grid mingguan berbentuk kolom per hari. Tiap hari punya susunan jam sendiri
 * (jumlah slot, waktu, dan kegiatan seperti Upacara/Solat Jumat bisa berbeda),
 * jadi waktu ditampilkan di tiap slot, bukan sebagai kolom bersama.
 */
export function ScheduleGrid({ daySchedules, renderCell, onCellClick }: ScheduleGridProps) {
  return (
    <div className="grid-wrapper">
      <div className="day-columns">
        {DAYS.map((dayName, day) => {
          const periods = daySchedules[day] ?? []
          const numbers = lessonNumbers(periods)
          return (
            <div className="day-col" key={dayName}>
              <div className="day-head">{dayName}</div>
              {periods.map((period) =>
                period.label !== null ? (
                  <div key={period.id} className="slot activity">
                    <span className="slot-meta">
                      {period.start}–{period.end}
                    </span>
                    <span className="activity-label">{period.label}</span>
                  </div>
                ) : (
                  <div
                    key={period.id}
                    className={onCellClick ? 'slot lesson clickable' : 'slot lesson'}
                    onClick={onCellClick ? () => onCellClick(day, period) : undefined}
                  >
                    <span className="slot-meta">
                      <span className="slot-num">{numbers.get(period.id)}</span> {period.start}–
                      {period.end}
                    </span>
                    <div className="slot-content">{renderCell(day, period)}</div>
                  </div>
                ),
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
