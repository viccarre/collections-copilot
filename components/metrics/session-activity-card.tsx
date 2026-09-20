import { CircleHelpIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatCurrency, FULL_BALANCE_ASSUMPTION_NOTE } from "@/lib/utils"
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
            <dt className="text-xs text-muted-foreground">Collected</dt>
            <dd className="text-lg font-semibold tabular-nums text-success">{activity.collectedCount}</dd>
            <dd className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              {formatCurrency(activity.collectedDollars)}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span tabIndex={0} className="text-muted-foreground hover:text-foreground">
                      <CircleHelpIcon className="size-3" />
                      <span className="sr-only">Note on collected amount</span>
                    </span>
                  }
                />
                <TooltipContent className="max-w-sm">{FULL_BALANCE_ASSUMPTION_NOTE}</TooltipContent>
              </Tooltip>
            </dd>
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
