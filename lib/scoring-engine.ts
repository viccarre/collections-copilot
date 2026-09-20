/**
 * Belvo Smart Retry System -- scoring engine (TypeScript port)
 *
 * This is a line-for-line port of decide() from outputs/collections_model.py,
 * meant to run LIVE inside the v0 prototype -- not a static snapshot. It is
 * pure and deterministic (no ML, no network calls), so it can run client-side
 * against the preloaded historic feature state (outputs/loan_features_seed.json)
 * for any as-of date, any operator decision recorded in-session, and any
 * risk-appetite config the sliders produce.
 *
 * Precedence (first match wins), exactly mirroring the Python:
 *   0. operator_stop            -> NO, permanent
 *   1. new_unattempted          -> YES, immediate
 *   2. human_gate_chargeback_risk -> HOLD (unless operator-cleared)
 *   3. writeoff_candidate       -> NO
 *   4. post_success_standard    -> YES, 3-day cadence
 *   5a. standard_cadence        -> YES, 3-day cadence   (streak < streakStandardMax)
 *   5b. cost_aware_throttle     -> YES, 5/10/14-day by loan size (streak < longTailStreak)
 *   5c. long_tail_dormant       -> YES, 30-day cadence  (streak >= longTailStreak)
 *
 * Updated 2026-09-20 to match the source model's Collections Expert review
 * (Q8): largeLoanThreshold corrected 1700 -> 1600 (the portfolio's actual
 * loan_amount 75th percentile), and the human-gate rationale is now
 * severity-aware (chargeback count, dollar total, recency) instead of one
 * flat sentence for every gated loan.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LoanFeatures {
  loan_id: number;
  payment_method_bank: string;
  loan_amount: number;
  total_amount_outstanding: number;
  overdue_days: number | null;
  n_attempts: number;
  current_streak: number | null;
  has_success: boolean;
  has_chargeback: boolean;
  chargeback_count: number;
  chargeback_total_amount: number;
  last_status: string | null; // "successful" | "failed" | "chargeback" | null
  last_failed_reason: number | null;
  last_attempt_at: string | null; // ISO timestamp
  last_chargeback_at: string | null; // ISO timestamp
}

export type OperatorAction = "resume" | "stop";

export interface OperatorDecision {
  loan_id: number;
  decision: OperatorAction;
  decided_at: string; // ISO timestamp
}

export type TreatmentTrack =
  | "operator_stop"
  | "new_unattempted"
  | "human_gate_chargeback_risk"
  | "writeoff_candidate"
  | "post_success_standard"
  | "standard_cadence"
  | "cost_aware_throttle"
  | "long_tail_dormant";

export type RetryDecision = "YES" | "HOLD" | "NO";

export interface DecisionRow {
  loan_id: number;
  treatment_track: TreatmentTrack;
  retry_decision: RetryDecision;
  recommended_cadence_days: number | null;
  next_eligible_at: string | null; // ISO
  is_eligible_today: boolean;
  priority_score: number | null;
  rationale: string;
}

/** The model's real tunables -- P3's risk-appetite sliders bind to these. */
export interface RiskAppetiteConfig {
  minCooldownDays: number; // A3, default 1
  streakStandardMax: number; // A4, default 20 -- standard -> throttle handoff
  longTailStreak: number; // A5, default 100 -- throttle -> dormant handoff
  largeLoanThreshold: number; // A4, default 1600 (corrected 2026-09-20 from a stale 1700)
  midLoanThreshold: number; // A4, default 700
  cadenceDays: {
    new: number; // 0
    postSuccess: number; // 3
    standard: number; // 3
    throttleLarge: number; // 5
    throttleMid: number; // 10
    throttleSmall: number; // 14
    dormant: number; // 30
  };
}

export const DEFAULT_CONFIG: RiskAppetiteConfig = {
  minCooldownDays: 1,
  streakStandardMax: 20,
  longTailStreak: 100,
  largeLoanThreshold: 1600,
  midLoanThreshold: 700,
  cadenceDays: {
    new: 0,
    postSuccess: 3,
    standard: 3,
    throttleLarge: 5,
    throttleMid: 10,
    throttleSmall: 14,
    dormant: 30,
  },
};

// ---------------------------------------------------------------------------
// Constants that are NOT sliders (empirical, not policy) -- changing these
// requires re-deriving them from the payment-request history, not a P3 control.
// ---------------------------------------------------------------------------

const INSUFFICIENT_FUNDS_REASON_CODE = 4.0;
const DEAD_REASON_CODES = new Set([1.0, 2.0, 3.0, 6.0, 8.0, 10.0, 11.0]);

// [minStreak, maxStreak, dollarsPerAttempt] -- computed 2026-09-19 from the
// real history (see wiki/concepts/attempt-economics.md). Not exposed as sliders.
const STREAK_BUCKET_RECOVERY: [number, number, number][] = [
  [0, 0, 56.31],
  [1, 4, 14.35],
  [5, 9, 6.38],
  [10, 19, 3.37],
  [20, 49, 1.74],
  [50, Number.POSITIVE_INFINITY, 0.63],
];

const STREAK_BUCKET_CHARGEBACK: [number, number, number][] = [
  [0, 0, 6.41],
  [1, 4, 5.15],
  [5, 9, 3.21],
  [10, 19, 2.37],
  [20, 49, 1.01],
  [50, Number.POSITIVE_INFINITY, 0.3],
];

const PORTFOLIO_MEDIAN_OUTSTANDING = 2156.0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bucketLookup(table: [number, number, number][], streak: number): number {
  for (const [lo, hi, val] of table) {
    if (streak >= lo && streak <= hi) return val;
  }
  return table[table.length - 1][2];
}

/** Expected $ recovered per attempt at this streak, net of expected chargeback loss. */
export function netRecoveryPerAttempt(streak: number): number {
  return bucketLookup(STREAK_BUCKET_RECOVERY, streak) - bucketLookup(STREAK_BUCKET_CHARGEBACK, streak);
}

export function loanSizeTier(
  loanAmount: number,
  config: RiskAppetiteConfig = DEFAULT_CONFIG
): "large" | "mid" | "small" {
  if (loanAmount >= config.largeLoanThreshold) return "large";
  if (loanAmount >= config.midLoanThreshold) return "mid";
  return "small";
}

function priorityScore(streak: number, totalAmountOutstanding: number): number {
  return Math.round((netRecoveryPerAttempt(streak) * totalAmountOutstanding / PORTFOLIO_MEDIAN_OUTSTANDING) * 100) / 100;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

/** "$1,800" style formatting, matching the Python model's f"${amount:,.0f}". */
function formatDollars(amount: number): string {
  return amount.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/**
 * Human-readable "when is the next attempt due" clause from a computed
 * next_eligible_at. Compares calendar dates (not raw millisecond deltas) so
 * an attempt timestamp that isn't exactly at midnight doesn't get rounded
 * into the wrong day relative to asOf.
 */
function dueDateClause(nextEligibleIso: string, asOf: Date): string {
  const nextDate = new Date(nextEligibleIso);
  const dateLabel = nextEligibleIso.slice(0, 10);
  const nextDay = Date.UTC(nextDate.getUTCFullYear(), nextDate.getUTCMonth(), nextDate.getUTCDate());
  const asOfDay = Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate());
  const diffDays = Math.round((nextDay - asOfDay) / 86400000);
  if (diffDays < 0) return `Next attempt was due on ${dateLabel} and is now overdue.`;
  if (diffDays === 0) return `Next attempt is due today (${dateLabel}).`;
  if (diffDays === 1) return `Next attempt due tomorrow (${dateLabel}).`;
  return `Next attempt due in ${diffDays} days (${dateLabel}).`;
}

// ---------------------------------------------------------------------------
// The decision function -- run this live, per loan, for the current as-of
// date, the current risk-appetite config, and the operator-decisions map
// built up from actions recorded in the session (or preloaded).
// ---------------------------------------------------------------------------

export function decide(
  loan: LoanFeatures,
  asOf: Date,
  operatorDecisions: Map<number, OperatorDecision>,
  config: RiskAppetiteConfig = DEFAULT_CONFIG
): DecisionRow {
  const override = operatorDecisions.get(loan.loan_id) ?? null;

  // 0. Explicit operator override to permanently stop.
  if (override && override.decision === "stop") {
    return {
      loan_id: loan.loan_id,
      treatment_track: "operator_stop",
      retry_decision: "NO",
      recommended_cadence_days: null,
      next_eligible_at: null,
      is_eligible_today: false,
      priority_score: null,
      rationale: `An operator manually stopped this loan on ${override.decided_at.slice(0, 10)} -- that decision is permanent and overrides everything else the model would otherwise recommend.`,
    };
  }

  // 1. Never attempted -- eligible immediately.
  if (loan.n_attempts === 0) {
    return {
      loan_id: loan.loan_id,
      treatment_track: "new_unattempted",
      retry_decision: "YES",
      recommended_cadence_days: config.cadenceDays.new,
      next_eligible_at: asOf.toISOString(),
      is_eligible_today: true,
      priority_score: priorityScore(0, loan.total_amount_outstanding),
      rationale: "This loan has never had a retry attempt, so there's no track record yet -- a first attempt is recommended right away.",
    };
  }

  // 2. Human-gate on chargeback signal, unless operator-cleared.
  const chargebackSignal = loan.has_chargeback || loan.last_status === "chargeback";
  const clearedByOperator =
    !!override &&
    override.decision === "resume" &&
    (loan.last_chargeback_at === null || new Date(override.decided_at) >= new Date(loan.last_chargeback_at));

  if (chargebackSignal && !clearedByOperator) {
    // Severity-aware rationale (2026-09-20, Collections Expert review Q8):
    // an operator can't tell a one-time, year-old chargeback from a chronic
    // repeat offender from a flat sentence alone, so state the count,
    // dollar total, and recency explicitly.
    const cbCount = loan.chargeback_count;
    const cbAmount = loan.chargeback_total_amount;
    const recency = loan.last_chargeback_at
      ? `${Math.round((asOf.getTime() - new Date(loan.last_chargeback_at).getTime()) / 86400000)}d ago`
      : "unknown";
    return {
      loan_id: loan.loan_id,
      treatment_track: "human_gate_chargeback_risk",
      retry_decision: "HOLD",
      recommended_cadence_days: null,
      next_eligible_at: null,
      is_eligible_today: false,
      priority_score: null,
      rationale: `This loan has ${cbCount} chargeback${cbCount !== 1 ? "s" : ""} totaling $${formatDollars(cbAmount)}, most recently ${recency}. That history means automated retries are paused until an operator reviews it and records a decision to resume or stop.`,
    };
  }

  // 3. Write-off candidate: most recent failure is permanently dead.
  if (loan.last_status === "failed" && loan.last_failed_reason !== null && DEAD_REASON_CODES.has(loan.last_failed_reason)) {
    return {
      loan_id: loan.loan_id,
      treatment_track: "writeoff_candidate",
      retry_decision: "NO",
      recommended_cadence_days: null,
      next_eligible_at: null,
      is_eligible_today: false,
      priority_score: null,
      rationale: "The last attempt failed for a reason that means it will never succeed on this payment rail -- not simply insufficient funds. Continuing to retry here would be pointless, so this loan should be routed to a different collections path instead.",
    };
  }

  // 4. Most recent attempt succeeded -- resume standard cadence (A1).
  if (loan.last_status === "successful") {
    const cadence = config.cadenceDays.postSuccess;
    const nextElig = addDays(loan.last_attempt_at!, Math.max(cadence, config.minCooldownDays));
    const lastSuccessDate = loan.last_attempt_at ? loan.last_attempt_at.slice(0, 10) : "recently";
    let rationale = `The last attempt on this loan succeeded on ${lastSuccessDate} -- retries continue on the normal schedule in case this was a partial payment rather than the full payoff. Worth confirming with Belvo whether this loan is paid in installments; if it's a single lump-sum loan, it may already be resolved.`;
    if (clearedByOperator)
      rationale += ` This loan also has chargeback history, but an operator cleared it for retry on ${override!.decided_at.slice(0, 10)}.`;
    return {
      loan_id: loan.loan_id,
      treatment_track: "post_success_standard",
      retry_decision: "YES",
      recommended_cadence_days: cadence,
      next_eligible_at: nextElig,
      is_eligible_today: new Date(nextElig) <= asOf,
      priority_score: priorityScore(0, loan.total_amount_outstanding),
      rationale,
    };
  }

  // 5. Failed, insufficient funds -- standard / throttle / long-tail dormant.
  const streak = loan.current_streak ?? 0;
  const tier = loanSizeTier(loan.loan_amount, config);
  let cadence: number;
  let track: TreatmentTrack;

  if (streak < config.streakStandardMax) {
    cadence = config.cadenceDays.standard;
    track = "standard_cadence";
  } else if (streak < config.longTailStreak) {
    cadence =
      tier === "large" ? config.cadenceDays.throttleLarge : tier === "mid" ? config.cadenceDays.throttleMid : config.cadenceDays.throttleSmall;
    track = "cost_aware_throttle";
  } else {
    cadence = config.cadenceDays.dormant;
    track = "long_tail_dormant";
  }

  const nextElig = addDays(loan.last_attempt_at!, Math.max(cadence, config.minCooldownDays));
  const dueClause = dueDateClause(nextElig, asOf);

  let rationale: string;
  if (track === "standard_cadence") {
    const threshold = config.streakStandardMax;
    const reBucketClause =
      streak + 1 >= threshold
        ? ` If this attempt also fails, it will move to the Reduced cadence track at ${threshold} consecutive failures.`
        : ` If failures continue, it moves to the Reduced cadence track once it reaches ${threshold} consecutive failures.`;
    rationale = `${streak} failed attempt${streak !== 1 ? "s" : ""} in a row on insufficient funds, but recovery odds are still reasonable at this point -- keep retrying on the normal ${cadence}-day schedule. ${dueClause}${reBucketClause}`;
  } else if (track === "cost_aware_throttle") {
    const threshold = config.longTailStreak;
    const reBucketClause =
      streak + 1 >= threshold
        ? ` If this attempt also fails, it will move to the Long-shot track at ${threshold} consecutive failures.`
        : ` If failures continue, it moves to the Long-shot track once it reaches ${threshold} consecutive failures.`;
    rationale = `${streak} failed attempts in a row on insufficient funds -- the chance of recovering money here has dropped to roughly 1% or less. Retries continue, but spaced out to every ${cadence} days (this is a ${tier}-size loan) so effort isn't wasted chasing a loan that rarely pays. ${dueClause}${reBucketClause}`;
  } else {
    rationale = `${streak} failed attempts in a row with no success -- recovery at this point is very unlikely. This loan stays technically eligible for a retry every ${cadence} days, but it's a strong candidate for a manual write-off or legal-review decision instead of continued automated retries. ${dueClause}`;
  }
  if (clearedByOperator)
    rationale += ` This loan also has chargeback history, but an operator cleared it for retry on ${override!.decided_at.slice(0, 10)}.`;

  return {
    loan_id: loan.loan_id,
    treatment_track: track,
    retry_decision: "YES",
    recommended_cadence_days: cadence,
    next_eligible_at: nextElig,
    is_eligible_today: new Date(nextElig) <= asOf,
    priority_score: priorityScore(streak, loan.total_amount_outstanding),
    rationale,
  };
}

/** Run decide() across the full preloaded portfolio for a given as-of date. */
export function runPortfolio(
  loans: LoanFeatures[],
  asOf: Date,
  operatorDecisions: OperatorDecision[],
  config: RiskAppetiteConfig = DEFAULT_CONFIG
): DecisionRow[] {
  const odMap = new Map<number, OperatorDecision>();
  for (const od of operatorDecisions) odMap.set(od.loan_id, od);
  return loans
    .map((loan) => decide(loan, asOf, odMap, config))
    .sort((a, b) => {
      if (a.is_eligible_today !== b.is_eligible_today) return a.is_eligible_today ? -1 : 1;
      return (b.priority_score ?? -Infinity) - (a.priority_score ?? -Infinity);
    });
}

// ---------------------------------------------------------------------------
// Daily outcome simulator -- there's no live payment rail behind this
// prototype, so each day's "actual attempt outcomes" for retried loans are
// sampled from the real historical rates at that loan's streak position
// (see outputs/streak_outcome_probabilities.json, computed 2026-09-20 from
// the same payment-request history the model itself is built on). This is
// simulated data and should be labeled as such in the UI -- it is not a
// real Belvo result feed.
//
// NOTE FOR STAGE 1: everything below this line is OUT OF SCOPE for this
// stage. It belongs to a later stage (rail-outcome simulation). Do not wire
// it up yet -- included here only so the full validated file is available
// for when we get there.
// ---------------------------------------------------------------------------

export interface StreakOutcomeProbabilities {
  p_success: number;
  p_chargeback: number;
  p_permanently_dead: number;
  p_insufficient_funds: number; // the four probabilities sum to 1 per bucket
}

// [minStreak, maxStreak, probabilities] -- empirical, computed from history,
// not a P3 slider (same status as STREAK_BUCKET_RECOVERY/CHARGEBACK above).
export const STREAK_OUTCOME_PROBABILITIES: [number, number, StreakOutcomeProbabilities][] = [
  [0, 0, { p_success: 0.2053, p_chargeback: 0.01962, p_permanently_dead: 0.02612, p_insufficient_funds: 0.74896 }],
  [1, 4, { p_success: 0.06397, p_chargeback: 0.01735, p_permanently_dead: 0.04537, p_insufficient_funds: 0.87331 }],
  [5, 9, { p_success: 0.02688, p_chargeback: 0.01071, p_permanently_dead: 0.0667, p_insufficient_funds: 0.89571 }],
  [10, 19, { p_success: 0.0139, p_chargeback: 0.00668, p_permanently_dead: 0.08686, p_insufficient_funds: 0.89256 }],
  [20, 49, { p_success: 0.00615, p_chargeback: 0.00369, p_permanently_dead: 0.1212, p_insufficient_funds: 0.86897 }],
  [50, Number.POSITIVE_INFINITY, { p_success: 0.0019, p_chargeback: 0.00107, p_permanently_dead: 0.26016, p_insufficient_funds: 0.73687 }],
];

function outcomeProbabilitiesForStreak(streak: number): StreakOutcomeProbabilities {
  for (const [lo, hi, p] of STREAK_OUTCOME_PROBABILITIES) {
    if (streak >= lo && streak <= hi) return p;
  }
  return STREAK_OUTCOME_PROBABILITIES[STREAK_OUTCOME_PROBABILITIES.length - 1][2];
}

export type SimulatedStatus = "successful" | "chargeback" | "failed";

export interface SimulatedAttempt {
  loan_id: number;
  status: SimulatedStatus;
  failed_reason: number | null; // set only when status === "failed"
  attempted_at: string; // ISO
}

/**
 * Sample one simulated attempt outcome for a loan that was YES / eligible
 * today, using the real historical rates at its current streak. Only call
 * this for loans the scoring engine actually decided to retry -- it does
 * not re-decide whether to retry, only what happens if a retry occurs.
 */
export function simulateAttemptOutcome(loan: LoanFeatures, asOf: Date, rng: () => number = Math.random): SimulatedAttempt {
  const streak = loan.current_streak ?? 0;
  const p = outcomeProbabilitiesForStreak(streak);
  const roll = rng();
  let status: SimulatedStatus;
  let failedReason: number | null = null;

  if (roll < p.p_success) {
    status = "successful";
  } else if (roll < p.p_success + p.p_chargeback) {
    status = "chargeback";
  } else if (roll < p.p_success + p.p_chargeback + p.p_permanently_dead) {
    status = "failed";
    failedReason = 1.0; // any DEAD_REASON_CODES member; UI should show a generic "permanently dead" label
  } else {
    status = "failed";
    failedReason = 4.0; // INSUFFICIENT_FUNDS_REASON_CODE
  }

  return {
    loan_id: loan.loan_id,
    status,
    failed_reason: failedReason,
    attempted_at: asOf.toISOString(),
  };
}

/**
 * Apply a simulated (or manually-recorded) attempt outcome to a loan's
 * feature state -- this is the "append to history, then re-score" half of
 * the daily cycle described in the PRD. Mirrors the streak/has_success/
 * has_chargeback update logic in build_loan_features(), but incrementally
 * (one new attempt) instead of recomputing from the full history each time.
 *
 * Note: a simulated chargeback has no real request amount (the simulator
 * only samples an outcome, not a dollar figure), so chargeback_count
 * increments but chargeback_total_amount is left as-is -- it only reflects
 * the seeded historical chargebacks. A known prototype limitation.
 */
export function applyAttemptOutcome(loan: LoanFeatures, attempt: SimulatedAttempt): LoanFeatures {
  const isSuccess = attempt.status === "successful";
  const isChargeback = attempt.status === "chargeback";
  return {
    ...loan,
    n_attempts: loan.n_attempts + 1,
    current_streak: isSuccess ? 0 : (loan.current_streak ?? 0) + 1,
    has_success: loan.has_success || isSuccess,
    has_chargeback: loan.has_chargeback || isChargeback,
    chargeback_count: loan.chargeback_count + (isChargeback ? 1 : 0),
    last_status: attempt.status,
    last_failed_reason: attempt.status === "failed" ? attempt.failed_reason : null,
    last_attempt_at: attempt.attempted_at,
    last_chargeback_at: isChargeback ? attempt.attempted_at : loan.last_chargeback_at,
  };
}
