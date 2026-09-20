import { cn } from "@/lib/utils"
import type { RetryDecision } from "@/lib/scoring-engine"

const DECISION_STYLES: Record<RetryDecision, string> = {
  YES: "bg-success/15 text-success border-success/30",
  HOLD: "bg-warning/15 text-warning border-warning/30",
  NO: "bg-destructive/15 text-destructive border-destructive/30",
}

export function RetryDecisionBadge({ decision }: { decision: RetryDecision }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold tracking-wide",
        DECISION_STYLES[decision],
      )}
    >
      {decision}
    </span>
  )
}
