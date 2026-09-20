import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import type { ChargebackSegment } from "@/lib/metrics"

const TIER_LABELS: Record<ChargebackSegment["tier"], string> = {
  large: "Large loans",
  mid: "Mid loans",
  small: "Small loans",
}

export function ChargebackRateBySegmentCard({ segments }: { segments: ChargebackSegment[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Chargeback rate by segment</CardTitle>
        <CardDescription>Share of today&apos;s loans with a chargeback on file, by the model&apos;s own size tiers.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {segments.map((segment) => (
          <div key={segment.tier} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">{TIER_LABELS[segment.tier]}</span>
              <span className="tabular-nums text-muted-foreground">
                {segment.chargebackCount}/{segment.totalCount} &middot; {(segment.rate * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label={`${TIER_LABELS[segment.tier]} chargeback rate`}>
              <div className="h-full bg-destructive" style={{ width: `${segment.rate * 100}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
