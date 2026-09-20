import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { SimulatedCollectionFile } from "@/lib/collection-file"

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
  })
}

export function CollectionFileSummary({ file }: { file: SimulatedCollectionFile }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Collection file arrived
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <p className="text-2xl font-semibold tabular-nums">
            {file.loans.length} <span className="text-sm font-normal text-muted-foreground">loans</span>
          </p>
          <p className="text-sm text-muted-foreground">
            As of {file.asOf} &middot; generated {formatTimestamp(file.generatedAt)}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
