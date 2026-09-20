/**
 * Data layer for the Smart Retry System prototype.
 *
 * Stage 1: the "collection file" (loans due for retry today) is a static
 * seed JSON, loaded once and scored with the ported scoring-engine.ts.
 *
 * This module is the seam later stages plug into without a rewrite:
 *   - Stage 2 will replace `getSeedLoans()` with a generated daily
 *     work-order file instead of a static import.
 *   - Stage 3's operator queue will call `getPortfolioDecisions()` with a
 *     live, session-built `OperatorDecision[]` array instead of `[]`.
 *   - Stage 4's metrics rollup will read from the same `DecisionRow[]`
 *     this module already produces.
 *
 * UI components should never import loans_seed.json or scoring-engine.ts
 * directly -- they should go through this module.
 */

import loansSeedData from "@/data/loans_seed.json"
import {
  DEFAULT_CONFIG,
  runPortfolio,
  type DecisionRow,
  type LoanFeatures,
  type OperatorDecision,
  type RiskAppetiteConfig,
} from "@/lib/scoring-engine"

interface LoansSeedFile {
  as_of_snapshot: string
  loan_count: number
  sample_note: string
  loans: LoanFeatures[]
}

const loansSeed = loansSeedData as LoansSeedFile

/** Matches the seed file's own `as_of_snapshot` field. */
export const SEED_AS_OF = new Date(`${loansSeed.as_of_snapshot}T00:00:00.000Z`)

export const SEED_SAMPLE_NOTE = loansSeed.sample_note

export function getSeedLoans(): LoanFeatures[] {
  return loansSeed.loans
}

/**
 * Score the full portfolio for a given as-of date, operator-decision set,
 * and risk-appetite config. Defaults reproduce the Stage 1 scenario: the
 * seed snapshot's own as-of date, no operator overrides yet, default config.
 */
export function getPortfolioDecisions(
  asOf: Date = SEED_AS_OF,
  operatorDecisions: OperatorDecision[] = [],
  config: RiskAppetiteConfig = DEFAULT_CONFIG,
): DecisionRow[] {
  return runPortfolio(getSeedLoans(), asOf, operatorDecisions, config)
}

/** Loan lookup by id, for UI that needs to join decision rows back to loan detail. */
export function getLoanById(loanId: number): LoanFeatures | undefined {
  return getSeedLoans().find((loan) => loan.loan_id === loanId)
}
