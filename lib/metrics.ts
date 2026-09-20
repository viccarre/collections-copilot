/**
 * Stage 4 metrics rollup -- pure computation over Stage 1-3's outputs
 * (EnrichedDecisionRow[] from lib/portfolio.ts, ActionLogEntry[] from
 * lib/action-log.ts). Every number here is a rollup of fields the pipeline
 * already produced -- this module does no scoring of its own.
 */

import type { EnrichedDecisionRow } from "@/lib/portfolio"
import type { TreatmentTrack } from "@/lib/scoring-engine"

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

/** Overdue-age band, keyed off the raw collection file's overdue_days field. */
export type OverdueAgeBand = "0-90" | "91-365" | "366+"

export interface OverdueAgeBucket {
  band: OverdueAgeBand
  count: number
  dollars: number
}

export interface QueueMetrics {
  composition: QueueComposition
  attemptsAvoided: AttemptsAvoided
  overdueAgeBreakdown: OverdueAgeBucket[]
}

function emptyBucket(): CompositionBucket {
  return { count: 0, dollars: 0 }
}

function addToBucket(bucket: CompositionBucket, row: EnrichedDecisionRow): CompositionBucket {
  return { count: bucket.count + 1, dollars: bucket.dollars + row.total_amount_outstanding }
}

const WRITTEN_OFF_TRACKS = new Set<TreatmentTrack>(["writeoff_candidate", "operator_stop"])

const OVERDUE_AGE_BANDS: OverdueAgeBand[] = ["0-90", "91-365", "366+"]

function overdueAgeBand(overdueDays: number | null): OverdueAgeBand {
  // A null overdue_days shouldn't occur for a loan that's actually in the
  // retry queue, but fall back to the youngest band defensively so every
  // row still lands in a bucket and totals keep summing correctly.
  const days = overdueDays ?? 0
  if (days <= 90) return "0-90"
  if (days <= 365) return "91-365"
  return "366+"
}

/** Computes every Stage 4 metric from the current queue. */
export function computeQueueMetrics(rows: EnrichedDecisionRow[]): QueueMetrics {
  let yes = emptyBucket()
  let hold = emptyBucket()
  let no = emptyBucket()
  let heldForReview = emptyBucket()
  let writtenOff = emptyBucket()

  const ageBuckets = new Map<OverdueAgeBand, CompositionBucket>(OVERDUE_AGE_BANDS.map((band) => [band, emptyBucket()]))

  for (const row of rows) {
    if (row.retry_decision === "YES") yes = addToBucket(yes, row)
    else if (row.retry_decision === "HOLD") hold = addToBucket(hold, row)
    else no = addToBucket(no, row)

    if (row.treatment_track === "human_gate_chargeback_risk") {
      heldForReview = addToBucket(heldForReview, row)
    } else if (WRITTEN_OFF_TRACKS.has(row.treatment_track)) {
      writtenOff = addToBucket(writtenOff, row)
    }

    const band = overdueAgeBand(row.overdue_days)
    ageBuckets.set(band, addToBucket(ageBuckets.get(band)!, row))
  }

  const overdueAgeBreakdown: OverdueAgeBucket[] = OVERDUE_AGE_BANDS.map((band) => ({
    band,
    ...ageBuckets.get(band)!,
  }))

  return {
    composition: {
      totalCount: rows.length,
      totalDollars: yes.dollars + hold.dollars + no.dollars,
      yes,
      hold,
      no,
    },
    attemptsAvoided: { heldForReview, writtenOff },
    overdueAgeBreakdown,
  }
}
