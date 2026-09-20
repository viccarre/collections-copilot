/**
 * Data layer for Belvo's accumulated per-loan attempt/chargeback history --
 * independent of any single day's collection file. Stage 2 joins this
 * against whichever loans show up in a given day's simulated collection
 * file (see lib/collection-file.ts); a real system would look this up from
 * Belvo's own data store instead of a static sample.
 */

import loanHistoryData from "@/data/loan_history_sample.json"
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
