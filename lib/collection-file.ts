/**
 * Data layer for Stage 2's "collection file" -- the upstream daily snapshot
 * of loans due for retry, as it would arrive from Belvo's lending system.
 *
 * There's no live bank feed behind this prototype, so `simulateCollectionFile()`
 * stands in for that upstream system: each call draws a random-sized subset
 * of the real 150-loan sample (never fabricated -- only which loans happen to
 * be "in today's file" varies) and stamps it with a fresh generated_at time.
 *
 * This file only knows about the raw snapshot fields (loan_amount,
 * overdue_days, etc). It has no idea about attempt history -- that lives in
 * lib/loan-history.ts and gets joined in lib/portfolio.ts.
 */

import collectionFileData from "@/data/collection_file_150.json"
import { getMostRecentHistoryTimestamp } from "@/lib/loan-history"

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

/**
 * The prototype's "today" -- exactly 1 calendar day after the most recent
 * record timestamp anywhere in the loan history/attempt dataset. This
 * dataset is historical (it ends around November 2025), so anchoring off
 * the real wall-clock date would make overdue-days, cadence eligibility,
 * and next-attempt-due math drift further out of sync with the data every
 * day this prototype keeps running. Every downstream "today" -- asOf below,
 * plus everything scoring-engine.ts derives from it -- must use this
 * instead of `new Date()`.
 */
function computeAnchoredAsOf(): string {
  const mostRecent = getMostRecentHistoryTimestamp()
  const anchored = new Date(
    Date.UTC(mostRecent.getUTCFullYear(), mostRecent.getUTCMonth(), mostRecent.getUTCDate() + 1),
  )
  return anchored.toISOString().slice(0, 10)
}

/** Dataset-anchored "today", as a YYYY-MM-DD date string. */
export const COLLECTION_FILE_AS_OF = computeAnchoredAsOf()

/** All 150 real loans that could show up in a given day's collection file. */
export function getCollectionFilePool(): CollectionFileLoan[] {
  return collectionFileSample.loans
}

export interface SimulatedCollectionFile {
  /** Dataset-anchored "today" (see COLLECTION_FILE_AS_OF) -- the scoring engine's asOf for this file. */
  asOf: string
  /** When this particular simulated file was generated, for display only. */
  generatedAt: string
  loans: CollectionFileLoan[]
}

const MIN_SIMULATED_LOANS = 30
const MAX_SIMULATED_LOANS = 60

/**
 * "Generates" today's collection file by randomly selecting a realistic
 * subset of the pool (30 to 60 loans, drawn from the full 150-loan pool).
 * Real fields, unmodified -- only which loans are included varies between
 * calls.
 */
export function simulateCollectionFile(): SimulatedCollectionFile {
  const pool = getCollectionFilePool()
  const minCount = Math.min(MIN_SIMULATED_LOANS, pool.length)
  const maxCount = Math.min(MAX_SIMULATED_LOANS, pool.length)
  const count = minCount + Math.floor(Math.random() * (maxCount - minCount + 1))

  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, count).sort((a, b) => a.loan_id - b.loan_id)

  return {
    asOf: COLLECTION_FILE_AS_OF,
    generatedAt: new Date().toISOString(),
    loans: selected,
  }
}
