import type { ScheduleEntry } from '../types'

export interface ConflictGroup {
  teacherId: string
  day: number
  periodId: string
  entries: ScheduleEntry[]
}

export interface ConflictInfo {
  groups: ConflictGroup[]
  entryIds: Set<string>
}

/** Guru yang sama mengajar di hari + jam yang sama untuk kelas berbeda = bentrok. */
export function findConflicts(entries: ScheduleEntry[]): ConflictInfo {
  const bySlot = new Map<string, ScheduleEntry[]>()
  for (const entry of entries) {
    if (entry.teacherId === null) continue
    const key = `${entry.teacherId}|${entry.day}|${entry.periodId}`
    const group = bySlot.get(key)
    if (group) group.push(entry)
    else bySlot.set(key, [entry])
  }

  const groups: ConflictGroup[] = []
  const entryIds = new Set<string>()
  for (const group of bySlot.values()) {
    if (group.length < 2) continue
    groups.push({
      teacherId: group[0].teacherId!,
      day: group[0].day,
      periodId: group[0].periodId,
      entries: group,
    })
    for (const entry of group) entryIds.add(entry.id)
  }
  return { groups, entryIds }
}
