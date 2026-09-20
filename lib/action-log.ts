/**
 * Session-level audit trail for Stage 3's operator actions. This is UI/session
 * state, not scoring output -- it records what an operator DID (send /
 * clear-for-retry / stop), not what the engine recommended.
 */

export type OperatorActionType = "sent" | "cleared-for-retry" | "stopped"

export interface ActionLogEntry {
  id: string
  loan_id: number
  action: OperatorActionType
  /** The rationale that was showing on the row at the moment of the action. */
  rationale: string
  timestamp: string // ISO
}

export const ACTION_LABELS: Record<OperatorActionType, string> = {
  sent: "Sent",
  "cleared-for-retry": "Cleared for retry",
  stopped: "Stopped permanently",
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8)
}

export function createActionLogEntry(
  loanId: number,
  action: OperatorActionType,
  rationale: string,
): ActionLogEntry {
  return {
    id: `${loanId}-${Date.now()}-${randomSuffix()}`,
    loan_id: loanId,
    action,
    rationale,
    timestamp: new Date().toISOString(),
  }
}
