"use client"

import { useMemo, useState } from "react"
import { FileStackIcon, RefreshCwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ActionLog } from "@/components/action-log"
import { CollectionFileSummary } from "@/components/collection-file-summary"
import { MetricsDashboard } from "@/components/metrics/metrics-dashboard"
import { GroupedDecisionQueue } from "@/components/queue/grouped-decision-queue"
import { createActionLogEntry, type ActionLogEntry } from "@/lib/action-log"
import { simulateCollectionFile, type SimulatedCollectionFile } from "@/lib/collection-file"
import { computeQueueMetrics } from "@/lib/metrics"
import { scoreCollectionFile, type EnrichedDecisionRow } from "@/lib/portfolio"
import type { OperatorDecision } from "@/lib/scoring-engine"

export function RetryQueueWorkspace() {
  const [collectionFile, setCollectionFile] = useState<SimulatedCollectionFile | null>(null)
  // Keyed by loan_id, not by file -- an operator's resume/stop decision is
  // about the loan, so it persists across "Simulate new file" clicks.
  const [operatorDecisions, setOperatorDecisions] = useState<Map<number, OperatorDecision>>(new Map())
  // Which loans have been manually sent this session. Also loan-scoped, not
  // file-scoped, so a previously-sent loan stays marked "Sent" if it
  // reappears in a later simulated file.
  const [sentLoanIds, setSentLoanIds] = useState<Set<number>>(new Set())
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([])

  const rows = useMemo(
    () => (collectionFile ? scoreCollectionFile(collectionFile, Array.from(operatorDecisions.values())) : []),
    [collectionFile, operatorDecisions],
  )

  const metrics = useMemo(() => computeQueueMetrics(rows, actionLog), [rows, actionLog])

  function handleSimulate() {
    setCollectionFile(simulateCollectionFile())
  }

  function handleSend(row: EnrichedDecisionRow) {
    setSentLoanIds((prev) => new Set(prev).add(row.loan_id))
    setActionLog((prev) => [createActionLogEntry(row.loan_id, "sent", row.rationale), ...prev])
  }

  function handleBulkSend(rowsToSend: EnrichedDecisionRow[]) {
    setSentLoanIds((prev) => {
      const next = new Set(prev)
      for (const row of rowsToSend) next.add(row.loan_id)
      return next
    })
    setActionLog((prev) => [
      ...rowsToSend.map((row) => createActionLogEntry(row.loan_id, "sent", row.rationale)).reverse(),
      ...prev,
    ])
  }

  function handleClearForRetry(row: EnrichedDecisionRow) {
    const decidedAt = new Date().toISOString()
    setOperatorDecisions((prev) => {
      const next = new Map(prev)
      next.set(row.loan_id, { loan_id: row.loan_id, decision: "resume", decided_at: decidedAt })
      return next
    })
    setActionLog((prev) => [createActionLogEntry(row.loan_id, "cleared-for-retry", row.rationale), ...prev])
  }

  function handleStopPermanently(row: EnrichedDecisionRow) {
    const decidedAt = new Date().toISOString()
    setOperatorDecisions((prev) => {
      const next = new Map(prev)
      next.set(row.loan_id, { loan_id: row.loan_id, decision: "stop", decided_at: decidedAt })
      return next
    })
    setActionLog((prev) => [createActionLogEntry(row.loan_id, "stopped", row.rationale), ...prev])
  }

  if (!collectionFile) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileStackIcon />
          </EmptyMedia>
          <EmptyTitle>No collection file loaded</EmptyTitle>
          <EmptyDescription>
            Simulate today&apos;s collection file to see which loans are due for retry and how the
            scoring engine treats each one. This stands in for the upstream lending-system feed --
            not a real bank feed in this prototype.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={handleSimulate}>
            <FileStackIcon data-icon="inline-start" />
            Simulate collection file
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CollectionFileSummary file={collectionFile} />
        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="outline" onClick={handleSimulate} className="sm:self-start">
                <RefreshCwIcon data-icon="inline-start" />
                Simulate new file
              </Button>
            }
          />
          <TooltipContent>
            Discards the current collection file and generates a new random subset of loans.
            Operator decisions and the action log persist.
          </TooltipContent>
        </Tooltip>
      </div>

      <MetricsDashboard metrics={metrics} />

      <GroupedDecisionQueue
        rows={rows}
        sentLoanIds={sentLoanIds}
        onSend={handleSend}
        onBulkSend={handleBulkSend}
        onClearForRetry={handleClearForRetry}
        onStopPermanently={handleStopPermanently}
      />

      <ActionLog entries={actionLog} />
    </div>
  )
}
