import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import type { QueueComposition } from "@/lib/metrics"

const SEGMENTS = [
  { key: "yes" as const, label: "Retry (YES)", barClass: "bg-success", textClass: "text-success" },
  { key: "hold" as const, label: "Hold for review", barClass: "bg-warning", textClass: "text-warning" },
  { key: "no" as const, label: "No retry", barClass: "bg-destructive", textClass: "text-destructive" },
]

export function QueueCompositionCard({ composition }: { composition: QueueComposition }) {
  const total = composition.totalCount

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Queue composition</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-semibold tabular-nums">{total}</p>
          <p className="text-sm text-muted-foreground">loans &middot; {formatCurrency(composition.totalDollars)} exposure</p>
        </div>

        <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label="Queue composition by decision">
          {SEGMENTS.map((segment) => {
            const bucket = composition[segment.key]
            const pct = total === 0 ? 0 : (bucket.count / total) * 100
            if (pct === 0) return null
            return <div key={segment.key} className={segment.barClass} style={{ width: `${pct}%` }} />
          })}
        </div>

        <dl className="grid grid-cols-3 gap-3">
          {SEGMENTS.map((segment) => {
            const bucket = composition[segment.key]
            return (
              <div key={segment.key} className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">{segment.label}</dt>
                <dd className={`text-lg font-semibold tabular-nums ${segment.textClass}`}>{bucket.count}</dd>
                <dd className="text-xs text-muted-foreground">{formatCurrency(bucket.dollars)}</dd>
              </div>
            )
          })}
        </dl>
      </CardContent>
    </Card>
  )
}
