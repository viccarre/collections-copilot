import { CircleHelpIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatCurrency, FULL_BALANCE_ASSUMPTION_NOTE } from "@/lib/utils"

export function ChargebackProtectionCard({ dollars }: { dollars: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Protected from chargeback risk</CardTitle>
        <CardDescription>
          Exposure on loans paused at the chargeback human-gate, before any further chargeback loss could accrue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="inline-flex items-center gap-1.5 text-2xl font-semibold tabular-nums text-warning">
          {formatCurrency(dollars)}
          <Tooltip>
            <TooltipTrigger
              render={
                <span tabIndex={0} className="text-muted-foreground hover:text-foreground">
                  <CircleHelpIcon className="size-4" />
                  <span className="sr-only">Note on exposure amount</span>
                </span>
              }
            />
            <TooltipContent className="max-w-sm">{FULL_BALANCE_ASSUMPTION_NOTE}</TooltipContent>
          </Tooltip>
        </p>
      </CardContent>
    </Card>
  )
}
