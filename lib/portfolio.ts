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
 *   - Stage 3's operator queue will pass a live, session-built
 *     `OperatorDecision[]` array instead of `[]`.
 *   - Stage 4's metrics rollup will read from the same `DecisionRow[]`
 *     this module already produces.
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
 * Joins and scores a simulated collection file end-to-end. Defaults to no
 * operator overrides and the default risk-appetite config, matching the
 * Stage 2 scenario.
 */
export function scoreCollectionFile(
  file: SimulatedCollectionFile,
  operatorDecisions: OperatorDecision[] = [],
  config: RiskAppetiteConfig = DEFAULT_CONFIG,
): DecisionRow[] {
  const loans = joinCollectionFileWithHistory(file.loans)
  const asOf = new Date(`${file.asOf}T00:00:00.000Z`)
  return runPortfolio(loans, asOf, operatorDecisions, config)
}
