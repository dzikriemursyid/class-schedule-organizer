import {
  DAYS,
  PAGI_THRESHOLD,
  teacherLabel,
  type AppState,
  type Assignment,
  type Distribution,
  type Period,
  type ScheduleEntry,
  type Subject,
} from '../types'
import { findConflicts } from './conflicts'

export interface AllocationOptions {
  mode: 'fill' | 'overwrite'
  restarts?: number
  seed?: number
}

export interface UnplacedItem {
  classId: string
  subjectId: string
  teacherId: string
  jpNeeded: number
  jpPlaced: number
  reason: string
}

export interface AllocationReport {
  placed: number
  requested: number
  unplaced: UnplacedItem[]
  warnings: string[]
  hasConflicts: boolean
}

export interface AllocationResult {
  entries: ScheduleEntry[]
  report: AllocationReport
}

/** RNG deterministik (mulberry32) supaya hasil bisa direproduksi per seed. */
function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Block {
  assignmentId: string
  classId: string
  subjectId: string
  teacherId: string
  size: number
  distribution: Distribution
  pagi: boolean
}

interface Placement {
  block: Block
  day: number
  periodIds: string[]
}

/** Pecah satu penugasan jadi blok penempatan sesuai distribusi mapel. */
function buildBlocks(a: Assignment, subject: Subject | undefined): Block[] {
  const distribution: Distribution = subject?.distribution ?? 'sebar'
  const pagi = subject?.timePreference === 'pagi'
  const base = {
    assignmentId: a.id,
    classId: a.classId,
    subjectId: a.subjectId,
    teacherId: a.teacherId,
    distribution,
    pagi,
  }
  if (a.jp <= 0) return []
  if (distribution === 'blok') return [{ ...base, size: a.jp }]
  if (distribution === 'ganda') {
    const blocks: Block[] = []
    let rem = a.jp
    while (rem > 0) {
      const size = Math.min(2, rem)
      blocks.push({ ...base, size })
      rem -= size
    }
    return blocks
  }
  // 'sebar' → JP blok berukuran 1
  return Array.from({ length: a.jp }, () => ({ ...base, size: 1 }))
}

interface Occupancy {
  classBusy: Set<string>
  teacherBusy: Set<string>
  teacherDay: Map<string, number>
  classDaySubject: Map<string, number>
}

const slot = (day: number, periodId: string) => `${day}|${periodId}`
const tdKey = (teacherId: string, day: number) => `${teacherId}|${day}`
const cdsKey = (day: number, classId: string, subjectId: string) => `${day}|${classId}|${subjectId}`

function cloneOccupancy(o: Occupancy): Occupancy {
  return {
    classBusy: new Set(o.classBusy),
    teacherBusy: new Set(o.teacherBusy),
    teacherDay: new Map(o.teacherDay),
    classDaySubject: new Map(o.classDaySubject),
  }
}

/**
 * Alokator jadwal (heuristik greedy + randomized restart). Selalu menghasilkan
 * jadwal tanpa bentrok; blok yang tak muat dilaporkan sebagai `unplaced`.
 */
export function allocate(state: AppState, options: AllocationOptions): AllocationResult {
  const subjectsById = new Map(state.subjects.map((s) => [s.id, s]))
  const teachersById = new Map(state.teachers.map((t) => [t.id, t]))
  const classesById = new Map(state.classes.map((c) => [c.id, c]))

  // Jam pelajaran (bukan kegiatan) per hari, terurut; index = jam ke- - 1.
  const lessonsByDay: Period[][] = state.daySchedules.map((periods) =>
    periods.filter((p) => p.label === null),
  )

  const unavailableByTeacher = new Map<string, Set<string>>(
    state.teachers.map((t) => [t.id, new Set(t.unavailable ?? [])]),
  )

  // Occupancy awal: mode 'fill' mengunci entri yang sudah ada.
  const initial: Occupancy = {
    classBusy: new Set(),
    teacherBusy: new Set(),
    teacherDay: new Map(),
    classDaySubject: new Map(),
  }
  if (options.mode === 'fill') {
    for (const e of state.entries) {
      const key = slot(e.day, e.periodId)
      initial.classBusy.add(`${e.classId}|${key}`)
      if (e.teacherId !== null) {
        initial.teacherBusy.add(`${e.teacherId}|${key}`)
        initial.teacherDay.set(tdKey(e.teacherId, e.day), (initial.teacherDay.get(tdKey(e.teacherId, e.day)) ?? 0) + 1)
      }
      initial.classDaySubject.set(
        cdsKey(e.day, e.classId, e.subjectId),
        (initial.classDaySubject.get(cdsKey(e.day, e.classId, e.subjectId)) ?? 0) + 1,
      )
    }
  }

  // Blok yang perlu ditempatkan.
  const allBlocks: Block[] = []
  for (const a of state.assignments) {
    if (!classesById.has(a.classId) || !teachersById.has(a.teacherId)) continue
    allBlocks.push(...buildBlocks(a, subjectsById.get(a.subjectId)))
  }
  const requested = allBlocks.reduce((sum, b) => sum + b.size, 0)

  function classBusyKey(classId: string, day: number, periodId: string) {
    return `${classId}|${slot(day, periodId)}`
  }
  function teacherBusyKey(teacherId: string, day: number, periodId: string) {
    return `${teacherId}|${slot(day, periodId)}`
  }

  // Semua kandidat (day, start) yang memenuhi batasan STATIS (pagi, ukuran,
  // ketersediaan guru) — occupancy dicek belakangan.
  function staticCandidates(b: Block): Array<{ day: number; periods: Period[]; startNo: number }> {
    const out: Array<{ day: number; periods: Period[]; startNo: number }> = []
    const unavail = unavailableByTeacher.get(b.teacherId)
    for (let day = 0; day < DAYS.length; day++) {
      const lessons = lessonsByDay[day]
      for (let i = 0; i + b.size <= lessons.length; i++) {
        const startNo = i + 1
        // 'pagi' → seluruh blok harus berada di jam-jam awal (end <= ambang).
        if (b.pagi && startNo + b.size - 1 > PAGI_THRESHOLD) continue
        const periods = lessons.slice(i, i + b.size)
        if (unavail && periods.some((p) => unavail.has(slot(day, p.id)))) continue
        out.push({ day, periods, startNo })
      }
    }
    return out
  }

  function fits(b: Block, day: number, periods: Period[], occ: Occupancy): boolean {
    const teacher = teachersById.get(b.teacherId)
    if (teacher?.maxPerDay != null) {
      const load = occ.teacherDay.get(tdKey(b.teacherId, day)) ?? 0
      if (load + b.size > teacher.maxPerDay) return false
    }
    for (const p of periods) {
      if (occ.classBusy.has(classBusyKey(b.classId, day, p.id))) return false
      if (occ.teacherBusy.has(teacherBusyKey(b.teacherId, day, p.id))) return false
    }
    return true
  }

  function commit(b: Block, day: number, periods: Period[], occ: Occupancy) {
    for (const p of periods) {
      occ.classBusy.add(classBusyKey(b.classId, day, p.id))
      occ.teacherBusy.add(teacherBusyKey(b.teacherId, day, p.id))
    }
    occ.teacherDay.set(tdKey(b.teacherId, day), (occ.teacherDay.get(tdKey(b.teacherId, day)) ?? 0) + b.size)
    occ.classDaySubject.set(
      cdsKey(day, b.classId, b.subjectId),
      (occ.classDaySubject.get(cdsKey(day, b.classId, b.subjectId)) ?? 0) + b.size,
    )
  }

  function runOnce(rng: () => number): { placements: Placement[]; unplaced: Block[] } {
    const occ = cloneOccupancy(initial)
    // Urut blok: paling sulit dulu (blok besar / wajib pagi / ukuran besar),
    // dengan sedikit keacakan untuk restart.
    const ordered = [...allBlocks].sort((a, b) => {
      const score = (x: Block) =>
        (x.distribution === 'blok' ? 1000 : 0) + (x.pagi ? 500 : 0) + x.size * 10
      return score(b) - score(a) + (rng() - 0.5)
    })

    const placements: Placement[] = []
    const unplaced: Block[] = []
    for (const b of ordered) {
      const candidates = staticCandidates(b).filter((c) => fits(b, c.day, c.periods, occ))
      if (candidates.length === 0) {
        unplaced.push(b)
        continue
      }
      // Skor: hindari mapel menumpuk sehari (sebar/ganda), seimbangkan beban guru
      // & isi harian kelas; sedikit acak untuk variasi restart.
      let best = candidates[0]
      let bestScore = Infinity
      for (const c of candidates) {
        const sameSubjectToday = occ.classDaySubject.get(cdsKey(c.day, b.classId, b.subjectId)) ?? 0
        const teacherLoad = occ.teacherDay.get(tdKey(b.teacherId, c.day)) ?? 0
        const spreadPenalty = b.distribution === 'blok' ? 0 : sameSubjectToday * 100
        const score = spreadPenalty + teacherLoad * 3 + c.startNo * 0.1 + rng() * 2
        if (score < bestScore) {
          bestScore = score
          best = c
        }
      }
      commit(b, best.day, best.periods, occ)
      placements.push({ block: b, day: best.day, periodIds: best.periods.map((p) => p.id) })
    }
    return { placements, unplaced }
  }

  const restarts = Math.max(1, options.restarts ?? 12)
  let bestRun = runOnce(makeRng(options.seed ?? 1))
  for (let r = 1; r < restarts && bestRun.unplaced.length > 0; r++) {
    const run = runOnce(makeRng((options.seed ?? 1) + r * 7919))
    if (run.unplaced.length < bestRun.unplaced.length) bestRun = run
  }

  // Bangun entries dari placement.
  const entries: ScheduleEntry[] = []
  for (const pl of bestRun.placements) {
    for (const periodId of pl.periodIds) {
      entries.push({
        id: crypto.randomUUID(),
        day: pl.day,
        periodId,
        classId: pl.block.classId,
        subjectId: pl.block.subjectId,
        teacherId: pl.block.teacherId,
      })
    }
  }

  // Ringkas blok gagal per (kelas, mapel, guru).
  const unplacedMap = new Map<string, UnplacedItem>()
  for (const b of bestRun.unplaced) {
    const key = `${b.classId}|${b.subjectId}|${b.teacherId}`
    const item = unplacedMap.get(key)
    const reason =
      staticCandidates(b).length === 0
        ? b.distribution === 'blok'
          ? `butuh ${b.size} jam berurutan dalam satu hari`
          : b.pagi
            ? 'tidak ada slot pagi yang cukup'
            : 'tidak ada slot jam pelajaran yang cukup'
        : 'slot penuh / bentrok dengan penugasan lain'
    if (item) {
      item.jpNeeded += b.size
    } else {
      unplacedMap.set(key, {
        classId: b.classId,
        subjectId: b.subjectId,
        teacherId: b.teacherId,
        jpNeeded: b.size,
        jpPlaced: 0,
        reason,
      })
    }
  }
  const unplaced = [...unplacedMap.values()]

  // Pra-cek kapasitas → peringatan.
  const warnings = buildWarnings(state, lessonsByDay, unavailableByTeacher, options.mode)

  // Validasi akhir: pastikan tak ada bentrok guru.
  const checkEntries =
    options.mode === 'fill' ? [...state.entries, ...entries] : entries
  const hasConflicts = findConflicts(checkEntries).groups.length > 0

  return {
    entries,
    report: {
      placed: entries.length,
      requested,
      unplaced,
      warnings,
      hasConflicts,
    },
  }
}

function buildWarnings(
  state: AppState,
  lessonsByDay: Period[][],
  unavailableByTeacher: Map<string, Set<string>>,
  mode: 'fill' | 'overwrite',
): string[] {
  const warnings: string[] = []
  const classesById = new Map(state.classes.map((c) => [c.id, c]))
  const teachersById = new Map(state.teachers.map((t) => [t.id, t]))
  const totalLessonSlots = lessonsByDay.reduce((sum, l) => sum + l.length, 0)

  // Slot kelas yang sudah terpakai (mode fill).
  const usedByClass = new Map<string, number>()
  const usedByTeacher = new Map<string, number>()
  if (mode === 'fill') {
    for (const e of state.entries) {
      usedByClass.set(e.classId, (usedByClass.get(e.classId) ?? 0) + 1)
      if (e.teacherId) usedByTeacher.set(e.teacherId, (usedByTeacher.get(e.teacherId) ?? 0) + 1)
    }
  }

  const jpByClass = new Map<string, number>()
  const jpByTeacher = new Map<string, number>()
  for (const a of state.assignments) {
    jpByClass.set(a.classId, (jpByClass.get(a.classId) ?? 0) + a.jp)
    jpByTeacher.set(a.teacherId, (jpByTeacher.get(a.teacherId) ?? 0) + a.jp)
  }

  for (const [classId, jp] of jpByClass) {
    const avail = totalLessonSlots - (usedByClass.get(classId) ?? 0)
    if (jp > avail) {
      const name = classesById.get(classId)?.name ?? '?'
      warnings.push(`Kelas ${name}: butuh ${jp} JP tapi hanya ada ${avail} slot tersedia.`)
    }
  }

  for (const [teacherId, jp] of jpByTeacher) {
    const teacher = teachersById.get(teacherId)
    if (!teacher) continue
    const unavail = unavailableByTeacher.get(teacherId)?.size ?? 0
    const avail = totalLessonSlots - unavail - (usedByTeacher.get(teacherId) ?? 0)
    if (jp > avail) {
      warnings.push(`Guru ${teacherLabel(teacher)}: total ${jp} JP melebihi ${avail} slot tersedia.`)
    }
    if (teacher.maxPerDay != null && jp > teacher.maxPerDay * DAYS.length) {
      warnings.push(
        `Guru ${teacherLabel(teacher)}: ${jp} JP melebihi kapasitas maks ${teacher.maxPerDay}/hari × ${DAYS.length} hari.`,
      )
    }
  }

  return warnings
}
