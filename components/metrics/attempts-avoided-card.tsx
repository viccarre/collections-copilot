import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import type { AttemptsAvoided } from "@/lib/metrics"

export function AttemptsAvoidedCard({ attemptsAvoided }: { attemptsAvoided: AttemptsAvoided }) {
  const { heldForReview, writtenOff } = attemptsAvoided
  const totalCount = heldForReview.count + writtenOff.count

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Attempts avoided today</CardTitle>
        <CardDescription>Loans the model recommends not attempting -- held for review or written off.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-semibold tabular-nums">{totalCount}</p>
          <p className="text-sm text-muted-foreground">loans not attempted today</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-0.5 rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Held for operator review</p>
            <p className="text-lg font-semibold tabular-nums text-warning">{heldForReview.count}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(heldForReview.dollars)}</p>
          </div>
          <div className="flex flex-col gap-0.5 rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Written off by model/operator</p>
            <p className="text-lg font-semibold tabular-nums text-destructive">{writtenOff.count}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(writtenOff.dollars)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
