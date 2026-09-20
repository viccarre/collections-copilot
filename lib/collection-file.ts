/**
 * Data layer for Stage 2's "collection file" -- the upstream daily snapshot
 * of loans due for retry, as it would arrive from Belvo's lending system.
 *
 * There's no live bank feed behind this prototype, so `simulateCollectionFile()`
 * stands in for that upstream system: each call draws a random-sized subset
 * of the real 44-loan sample (never fabricated -- only which loans happen to
 * be "in today's file" varies) and stamps it with a fresh generated_at time.
 *
 * This file only knows about the raw snapshot fields (loan_amount,
 * overdue_days, etc). It has no idea about attempt history -- that lives in
 * lib/loan-history.ts and gets joined in lib/portfolio.ts.
 */

import collectionFileData from "@/data/collection_file_sample.json"

export interface CollectionFileLoan {
  loan_id: number
  payment_method_bank: string
  loan_amount: number
  total_amount_outstanding: number
  overdue_days: number | null
}

interface CollectionFileSampleFile {
  generated_note: string
  as_of: string
  loans: CollectionFileLoan[]
}

const collectionFileSample = collectionFileData as CollectionFileSampleFile

export const COLLECTION_FILE_NOTE = collectionFileSample.generated_note

/** All 44 real loans that could show up in a given day's collection file. */
export function getCollectionFilePool(): CollectionFileLoan[] {
  return collectionFileSample.loans
}

export interface SimulatedCollectionFile {
  /** Matches the sample's own as-of date -- the scoring engine's asOf for this file. */
  asOf: string
  /** When this particular simulated file was generated, for display only. */
  generatedAt: string
  loans: CollectionFileLoan[]
}

const MIN_SIMULATED_LOANS = 25

/**
 * "Generates" today's collection file by randomly selecting a realistic
 * subset of the pool (25 to all 44 loans). Real fields, unmodified -- only
 * which loans are included varies between calls.
 */
export function simulateCollectionFile(): SimulatedCollectionFile {
  const pool = getCollectionFilePool()
  const minCount = Math.min(MIN_SIMULATED_LOANS, pool.length)
  const count = minCount + Math.floor(Math.random() * (pool.length - minCount + 1))

  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, count).sort((a, b) => a.loan_id - b.loan_id)

  return {
    asOf: collectionFileSample.as_of,
    generatedAt: new Date().toISOString(),
    loans: selected,
  }
}
