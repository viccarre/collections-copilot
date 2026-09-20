import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import type { OverdueAgeBand, OverdueAgeBucket } from "@/lib/metrics"

const BAND_LABELS: Record<OverdueAgeBand, string> = {
  "0-90": "0-90 days",
  "91-365": "91-365 days",
  "366+": "366+ days",
}

const BAND_STYLES: Record<OverdueAgeBand, { barClass: string; textClass: string }> = {
  "0-90": { barClass: "bg-success", textClass: "text-success" },
  "91-365": { barClass: "bg-warning", textClass: "text-warning" },
  "366+": { barClass: "bg-destructive", textClass: "text-destructive" },
}

export function OverdueAgeBreakdownCard({ buckets }: { buckets: OverdueAgeBucket[] }) {
  const totalDollars = buckets.reduce((sum, bucket) => sum + bucket.dollars, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Exposure by overdue age</CardTitle>
        <CardDescription>How long today&apos;s loans have been overdue, and what&apos;s at stake in each band.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div
          className="flex h-2 w-full overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label="Exposure by overdue age band"
        >
          {buckets.map((bucket) => {
            const pct = totalDollars === 0 ? 0 : (bucket.dollars / totalDollars) * 100
            if (pct === 0) return null
            return <div key={bucket.band} className={BAND_STYLES[bucket.band].barClass} style={{ width: `${pct}%` }} />
          })}
        </div>

        <dl className="grid grid-cols-3 gap-3">
          {buckets.map((bucket) => (
            <div key={bucket.band} className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">{BAND_LABELS[bucket.band]}</dt>
              <dd className={`text-lg font-semibold tabular-nums ${BAND_STYLES[bucket.band].textClass}`}>
                {bucket.count}
              </dd>
              <dd className="text-xs text-muted-foreground">{formatCurrency(bucket.dollars)}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
