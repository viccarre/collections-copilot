import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DecisionRow } from "@/lib/scoring-engine"

function countByDecision(rows: DecisionRow[]) {
  return {
    YES: rows.filter((r) => r.retry_decision === "YES").length,
    HOLD: rows.filter((r) => r.retry_decision === "HOLD").length,
    NO: rows.filter((r) => r.retry_decision === "NO").length,
  }
}

const SUMMARY_ITEMS = [
  { key: "YES" as const, label: "Retry (YES)", colorClass: "text-success" },
  { key: "HOLD" as const, label: "Hold for review", colorClass: "text-warning" },
  { key: "NO" as const, label: "No retry", colorClass: "text-destructive" },
]

export function QueueSummary({ rows }: { rows: DecisionRow[] }) {
  const counts = countByDecision(rows)
  const eligibleToday = rows.filter((r) => r.is_eligible_today).length

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Total loans</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">{rows.length}</p>
          <p className="text-xs text-muted-foreground">{eligibleToday} eligible today</p>
        </CardContent>
      </Card>
      {SUMMARY_ITEMS.map((item) => (
        <Card key={item.key}>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-semibold tabular-nums ${item.colorClass}`}>{counts[item.key]}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
