/**
 * Stage 4 metrics rollup -- pure computation over Stage 1-3's outputs
 * (EnrichedDecisionRow[] from lib/portfolio.ts, ActionLogEntry[] from
 * lib/action-log.ts). Reads scoring-engine.ts's real loanSizeTier() helper
 * for the size-tier segment, but otherwise does no scoring of its own --
 * every number here is a rollup of fields the pipeline already produced.
 */

import type { ActionLogEntry } from "@/lib/action-log"
import type { EnrichedDecisionRow } from "@/lib/portfolio"
import { loanSizeTier, type TreatmentTrack } from "@/lib/scoring-engine"

export interface CompositionBucket {
  count: number
  dollars: number
}

export interface QueueComposition {
  totalCount: number
  totalDollars: number
  yes: CompositionBucket
  hold: CompositionBucket
  no: CompositionBucket
}

export interface AttemptsAvoided {
  /** HOLD -- human_gate_chargeback_risk: paused for operator review, not written off. */
  heldForReview: CompositionBucket
  /** NO -- writeoff_candidate + operator_stop: model/operator has given up. */
  writtenOff: CompositionBucket
}

export type LoanSizeTier = ReturnType<typeof loanSizeTier>

export interface ChargebackSegment {
  tier: LoanSizeTier
  totalCount: number
  chargebackCount: number
  rate: number // 0..1, 0 when totalCount === 0
}

export interface SessionActivity {
  sentCount: number
  sentDollars: number
  clearedForRetryCount: number
  stoppedCount: number
}

export interface QueueMetrics {
  composition: QueueComposition
  attemptsAvoided: AttemptsAvoided
  dollarsProtectedFromChargebackRisk: number
  chargebackBySegment: ChargebackSegment[]
  sessionActivity: SessionActivity
}

function emptyBucket(): CompositionBucket {
  return { count: 0, dollars: 0 }
}

function addToBucket(bucket: CompositionBucket, row: EnrichedDecisionRow): CompositionBucket {
  return { count: bucket.count + 1, dollars: bucket.dollars + row.total_amount_outstanding }
}

const WRITTEN_OFF_TRACKS = new Set<TreatmentTrack>(["writeoff_candidate", "operator_stop"])

const SIZE_TIERS: LoanSizeTier[] = ["large", "mid", "small"]

/** Computes every Stage 4 metric from the current queue and session activity. */
export function computeQueueMetrics(rows: EnrichedDecisionRow[], actionLog: ActionLogEntry[]): QueueMetrics {
  let yes = emptyBucket()
  let hold = emptyBucket()
  let no = emptyBucket()
  let heldForReview = emptyBucket()
  let writtenOff = emptyBucket()
  let dollarsProtectedFromChargebackRisk = 0

  const tierTotals = new Map<LoanSizeTier, { total: number; chargebacks: number }>(
    SIZE_TIERS.map((tier) => [tier, { total: 0, chargebacks: 0 }]),
  )

  for (const row of rows) {
    if (row.retry_decision === "YES") yes = addToBucket(yes, row)
    else if (row.retry_decision === "HOLD") hold = addToBucket(hold, row)
    else no = addToBucket(no, row)

    if (row.treatment_track === "human_gate_chargeback_risk") {
      heldForReview = addToBucket(heldForReview, row)
      dollarsProtectedFromChargebackRisk += row.total_amount_outstanding
    } else if (WRITTEN_OFF_TRACKS.has(row.treatment_track)) {
      writtenOff = addToBucket(writtenOff, row)
    }

    const tier = loanSizeTier(row.loan_amount)
    const tierTotal = tierTotals.get(tier)!
    tierTotal.total += 1
    if (row.has_chargeback) tierTotal.chargebacks += 1
  }

  const chargebackBySegment: ChargebackSegment[] = SIZE_TIERS.map((tier) => {
    const { total, chargebacks } = tierTotals.get(tier)!
    return { tier, totalCount: total, chargebackCount: chargebacks, rate: total === 0 ? 0 : chargebacks / total }
  })

  const rowsByLoanId = new Map(rows.map((row) => [row.loan_id, row]))
  let sentCount = 0
  let sentDollars = 0
  let clearedForRetryCount = 0
  let stoppedCount = 0
  const countedSentLoanIds = new Set<number>()

  for (const entry of actionLog) {
    if (entry.action === "sent") {
      // A loan can only be sent once in practice (rows disable the action
      // afterward), but guard against double-counting a re-logged entry.
      if (!countedSentLoanIds.has(entry.loan_id)) {
        countedSentLoanIds.add(entry.loan_id)
        sentCount += 1
        sentDollars += rowsByLoanId.get(entry.loan_id)?.total_amount_outstanding ?? 0
      }
    } else if (entry.action === "cleared-for-retry") {
      clearedForRetryCount += 1
    } else if (entry.action === "stopped") {
      stoppedCount += 1
    }
  }

  return {
    composition: {
      totalCount: rows.length,
      totalDollars: yes.dollars + hold.dollars + no.dollars,
      yes,
      hold,
      no,
    },
    attemptsAvoided: { heldForReview, writtenOff },
    dollarsProtectedFromChargebackRisk,
    chargebackBySegment,
    sessionActivity: { sentCount, sentDollars, clearedForRetryCount, stoppedCount },
  }
}
