/**
 * Data layer that joins Stage 2's two upstream sources into the shape the
 * scoring engine expects, then runs it.
 *
 *   collection-file.ts  (today's raw snapshot, simulated)  --\
 *                                                              >-- joinCollectionFileWithHistory --> LoanFeatures[] --> runPortfolio() --> DecisionRow[]
 *   loan-history.ts     (accumulated attempt history)      --/
 *
 * UI components should call `scoreCollectionFile()` and never import the
 * raw JSON or scoring-engine.ts directly. This is the seam later stages
 * plug into without a rewrite:
 *   - Stage 3's operator queue passes a live, session-built
 *     `OperatorDecision[]` array (built from operator resume/stop actions)
 *     instead of `[]`, and reads the enriched rows below to render dollar
 *     exposure without changing scoring-engine.ts.
 *   - Stage 4's metrics rollup will read from the same enriched rows this
 *     module already produces.
 */

import { getLoanHistory, type LoanHistoryRecord } from "@/lib/loan-history"
import type { CollectionFileLoan, SimulatedCollectionFile } from "@/lib/collection-file"
import {
  DEFAULT_CONFIG,
  runPortfolio,
  type DecisionRow,
  type LoanFeatures,
  type OperatorDecision,
  type RiskAppetiteConfig,
} from "@/lib/scoring-engine"

/**
 * Joins a collection file's raw snapshot rows against Belvo's accumulated
 * loan history by loan_id to reconstruct the full LoanFeatures records the
 * scoring engine expects.
 *
 * All loan_ids in this prototype's sample exist in both files, so the join
 * is always complete here -- a real system would need a policy for a
 * collection-file loan with no history record.
 */
export function joinCollectionFileWithHistory(collectionLoans: CollectionFileLoan[]): LoanFeatures[] {
  return collectionLoans.map((loan) => {
    const history = getLoanHistory(loan.loan_id)
    if (!history) {
      throw new Error(`No loan history found for loan_id ${loan.loan_id} -- join is expected to be complete.`)
    }
    return { ...loan, ...(history as LoanHistoryRecord) }
  })
}

/**
 * A DecisionRow plus the raw-snapshot display fields the operator queue
 * needs (dollar exposure for sorting/grouping, bank, loan size) -- decide()
 * and DecisionRow itself stay untouched; this is purely an enrichment done
 * after scoring, in the data layer, so components never reach into
 * LoanFeatures directly.
 */
export interface EnrichedDecisionRow extends DecisionRow {
  payment_method_bank: string
  loan_amount: number
  total_amount_outstanding: number
}

/**
 * Joins and scores a simulated collection file end-to-end, then enriches
 * each decision with the display fields the operator queue needs. Defaults
 * to no operator overrides and the default risk-appetite config; Stage 3
 * passes the session's live operator-decisions array here.
 */
export function scoreCollectionFile(
  file: SimulatedCollectionFile,
  operatorDecisions: OperatorDecision[] = [],
  config: RiskAppetiteConfig = DEFAULT_CONFIG,
): EnrichedDecisionRow[] {
  const loans = joinCollectionFileWithHistory(file.loans)
  const loansById = new Map(loans.map((loan) => [loan.loan_id, loan]))
  const asOf = new Date(`${file.asOf}T00:00:00.000Z`)
  const decisions = runPortfolio(loans, asOf, operatorDecisions, config)

  return decisions.map((decision) => {
    const loan = loansById.get(decision.loan_id)
    if (!loan) {
      throw new Error(`No joined loan found for loan_id ${decision.loan_id} -- should be unreachable.`)
    }
    return {
      ...decision,
      payment_method_bank: loan.payment_method_bank,
      loan_amount: loan.loan_amount,
      total_amount_outstanding: loan.total_amount_outstanding,
    }
  })
}
