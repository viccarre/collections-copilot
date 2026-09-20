/**
 * Data layer for Belvo's accumulated per-loan attempt/chargeback history --
 * independent of any single day's collection file. Stage 2 joins this
 * against whichever loans show up in a given day's simulated collection
 * file (see lib/collection-file.ts); a real system would look this up from
 * Belvo's own data store instead of a static sample.
 */

import loanHistoryData from "@/data/loan_history_150.json"
import type { LoanFeatures } from "@/lib/scoring-engine"

/** The historic-only slice of LoanFeatures -- everything except the raw snapshot fields. */
export type LoanHistoryRecord = Omit<
  LoanFeatures,
  "payment_method_bank" | "loan_amount" | "total_amount_outstanding" | "overdue_days"
>

interface LoanHistorySampleFile {
  sample_note: string
  as_of_snapshot: string
  loans: LoanHistoryRecord[]
}

const loanHistorySample = loanHistoryData as LoanHistorySampleFile

export const LOAN_HISTORY_NOTE = loanHistorySample.sample_note

const loanHistoryById = new Map<number, LoanHistoryRecord>(
  loanHistorySample.loans.map((loan) => [loan.loan_id, loan]),
)

export function getLoanHistory(loanId: number): LoanHistoryRecord | undefined {
  return loanHistoryById.get(loanId)
}

/**
 * The latest record timestamp anywhere in the accumulated history
 * (last_attempt_at or last_chargeback_at, across every loan). This dataset
 * is historical -- its records stop around November 2025 -- so any
 * "today" used for downstream cadence/eligibility math must be derived
 * from this value, never from the real wall-clock date, or the numbers
 * stop representing a coherent point-in-time snapshot.
 */
export function getMostRecentHistoryTimestamp(): Date {
  let maxMs = 0
  for (const loan of loanHistorySample.loans) {
    if (loan.last_attempt_at) {
      maxMs = Math.max(maxMs, new Date(loan.last_attempt_at).getTime())
    }
    if (loan.last_chargeback_at) {
      maxMs = Math.max(maxMs, new Date(loan.last_chargeback_at).getTime())
    }
  }
  if (maxMs === 0) {
    throw new Error("No timestamped records found in loan history -- cannot anchor 'today'.")
  }
  return new Date(maxMs)
}
