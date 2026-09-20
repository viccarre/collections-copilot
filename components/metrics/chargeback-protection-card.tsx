import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"

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
        <p className="text-2xl font-semibold tabular-nums text-warning">{formatCurrency(dollars)}</p>
      </CardContent>
    </Card>
  )
}
