"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { YesSection } from "@/components/queue/yes-section"
import { HoldSection } from "@/components/queue/hold-section"
import { NoSection } from "@/components/queue/no-section"
import type { EnrichedDecisionRow } from "@/lib/portfolio"

function byExposureDesc(a: EnrichedDecisionRow, b: EnrichedDecisionRow): number {
  return b.total_amount_outstanding - a.total_amount_outstanding
}

interface GroupedDecisionQueueProps {
  rows: EnrichedDecisionRow[]
  collectedLoanIds: Set<number>
  onCollect: (row: EnrichedDecisionRow) => void
  onBulkCollect: (rows: EnrichedDecisionRow[]) => void
  onClearForRetry: (row: EnrichedDecisionRow) => void
  onStopPermanently: (row: EnrichedDecisionRow) => void
}

export function GroupedDecisionQueue({
  rows,
  collectedLoanIds,
  onCollect,
  onBulkCollect,
  onClearForRetry,
  onStopPermanently,
}: GroupedDecisionQueueProps) {
  const { yesRows, holdRows, noRows } = useMemo(
    () => ({
      yesRows: rows.filter((row) => row.retry_decision === "YES").sort(byExposureDesc),
      holdRows: rows.filter((row) => row.retry_decision === "HOLD").sort(byExposureDesc),
      noRows: rows.filter((row) => row.retry_decision === "NO").sort(byExposureDesc),
    }),
    [rows],
  )

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No loans in this collection file.
      </p>
    )
  }

  return (
    <Tabs defaultValue="yes" className="gap-4">
      <TabsList>
        <TabsTrigger value="yes" className="gap-2 data-[state=active]:text-success">
          Ready to collect
          <Badge variant="secondary">{yesRows.length}</Badge>
        </TabsTrigger>
        <TabsTrigger value="hold" className="gap-2 data-[state=active]:text-warning">
          Needs review
          <Badge variant="secondary">{holdRows.length}</Badge>
        </TabsTrigger>
        <TabsTrigger value="no" className="gap-2 data-[state=active]:text-destructive">
          Not retrying
          <Badge variant="secondary">{noRows.length}</Badge>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="yes">
        <YesSection rows={yesRows} collectedLoanIds={collectedLoanIds} onCollect={onCollect} onBulkCollect={onBulkCollect} />
      </TabsContent>
      <TabsContent value="hold">
        <HoldSection rows={holdRows} onClearForRetry={onClearForRetry} onStopPermanently={onStopPermanently} />
      </TabsContent>
      <TabsContent value="no">
        <NoSection rows={noRows} onStopPermanently={onStopPermanently} />
      </TabsContent>
    </Tabs>
  )
}
