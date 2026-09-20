import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import type { SessionActivity } from "@/lib/metrics"

export function SessionActivityCard({ activity }: { activity: SessionActivity }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Session activity</CardTitle>
        <CardDescription>What you&apos;ve actually done this session -- every action here was explicit.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Sent</dt>
            <dd className="text-lg font-semibold tabular-nums text-success">{activity.sentCount}</dd>
            <dd className="text-xs text-muted-foreground">{formatCurrency(activity.sentDollars)}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Cleared for retry</dt>
            <dd className="text-lg font-semibold tabular-nums">{activity.clearedForRetryCount}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Stopped</dt>
            <dd className="text-lg font-semibold tabular-nums text-destructive">{activity.stoppedCount}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
