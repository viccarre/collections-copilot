"use client"

import { useMemo, useState } from "react"
import { FileStackIcon, HistoryIcon, RefreshCwIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ActionLog } from "@/components/action-log"
import { CollectionFileSummary } from "@/components/collection-file-summary"
import { MetricsDashboard } from "@/components/metrics/metrics-dashboard"
import { GroupedDecisionQueue } from "@/components/queue/grouped-decision-queue"
import type { AwaitingResponseOutcome } from "@/components/queue/resolve-awaiting-popover"
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
  // Which loans have been manually collected on this session. Also
  // loan-scoped, not file-scoped, so a previously-collected loan stays
  // marked "Collected" if it reappears in a later simulated file.
  const [collectedLoanIds, setCollectedLoanIds] = useState<Set<number>>(new Set())
  // Loans an operator has contacted directly instead of continuing
  // automated retries. Loan-scoped like the other operator state above --
  // once contacted, a loan stays parked in Awaiting response even if it
  // reappears in a later simulated file.
  const [awaitingResponseLoanIds, setAwaitingResponseLoanIds] = useState<Set<number>>(new Set())
  // Every loan ever contacted this session, for the "Contacted" row badge.
  // Unlike awaitingResponseLoanIds, this never clears on Resolve -- it's a
  // historical marker so a loan that gets resolved back into circulation
  // still shows an operator it was already reached out to once today.
  const [contactedLoanIds, setContactedLoanIds] = useState<Set<number>>(new Set())
  // Manual due-date overrides. This never changes what the scoring engine
  // computes -- it only changes what's displayed and logs the operator's
  // intent; nothing auto-fires on the picked date.
  const [rescheduledDueDates, setRescheduledDueDates] = useState<Map<number, string>>(new Map())
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([])

  const rows = useMemo(
    () => (collectionFile ? scoreCollectionFile(collectionFile, Array.from(operatorDecisions.values())) : []),
    [collectionFile, operatorDecisions],
  )

  // Loans awaiting a borrower response are pulled out of the normal
  // yes/hold/no buckets entirely and shown in their own tab instead.
  const activeRows = useMemo(
    () => rows.filter((row) => !awaitingResponseLoanIds.has(row.loan_id)),
    [rows, awaitingResponseLoanIds],
  )
  const awaitingRows = useMemo(
    () => rows.filter((row) => awaitingResponseLoanIds.has(row.loan_id)),
    [rows, awaitingResponseLoanIds],
  )

  const metrics = useMemo(() => computeQueueMetrics(activeRows), [activeRows])

  function handleSimulate() {
    setCollectionFile(simulateCollectionFile())
  }

  function handleCollect(row: EnrichedDecisionRow) {
    setCollectedLoanIds((prev) => new Set(prev).add(row.loan_id))
    setActionLog((prev) => [createActionLogEntry(row.loan_id, "collected", row.rationale), ...prev])
  }

  function handleBulkCollect(rowsToCollect: EnrichedDecisionRow[]) {
    setCollectedLoanIds((prev) => {
      const next = new Set(prev)
      for (const row of rowsToCollect) next.add(row.loan_id)
      return next
    })
    setActionLog((prev) => [
      ...rowsToCollect.map((row) => createActionLogEntry(row.loan_id, "collected", row.rationale)).reverse(),
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

  function handleContactBorrower(row: EnrichedDecisionRow) {
    setAwaitingResponseLoanIds((prev) => new Set(prev).add(row.loan_id))
    setContactedLoanIds((prev) => new Set(prev).add(row.loan_id))
    setActionLog((prev) => [
      createActionLogEntry(
        row.loan_id,
        "contacted-borrower",
        `${row.rationale} An operator contacted the borrower directly instead of another automated attempt -- this loan moved to Awaiting response.`,
      ),
      ...prev,
    ])
  }

  // Manual escape hatch for Awaiting response -- until real response-capture
  // is built, this is the only way to move a contacted loan forward. Note is
  // a free-text log entry, not structured data.
  function handleResolveAwaitingResponse(row: EnrichedDecisionRow, outcome: AwaitingResponseOutcome, note: string) {
    setAwaitingResponseLoanIds((prev) => {
      const next = new Set(prev)
      next.delete(row.loan_id)
      return next
    })
    const decidedAt = new Date().toISOString()
    setOperatorDecisions((prev) => {
      const next = new Map(prev)
      next.set(row.loan_id, { loan_id: row.loan_id, decision: outcome === "cleared" ? "resume" : "stop", decided_at: decidedAt })
      return next
    })
    const noteSuffix = note.trim() ? ` Borrower response note: "${note.trim()}"` : ""
    setActionLog((prev) => [
      createActionLogEntry(
        row.loan_id,
        outcome === "cleared" ? "cleared-for-retry" : "stopped",
        `${row.rationale} Resolved from Awaiting response.${noteSuffix}`,
      ),
      ...prev,
    ])
  }

  function handleReschedule(row: EnrichedDecisionRow, date: string) {
    setRescheduledDueDates((prev) => {
      const next = new Map(prev)
      next.set(row.loan_id, date)
      return next
    })
    const computedDate = row.next_eligible_at ? row.next_eligible_at.slice(0, 10) : "unknown"
    setActionLog((prev) => [
      createActionLogEntry(
        row.loan_id,
        "rescheduled",
        `${row.rationale} An operator rescheduled this loan's next attempt to ${date} (model had computed ${computedDate}). This is a manual reminder only -- the operator still needs to come back and click Collect.`,
      ),
      ...prev,
    ])
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CollectionFileSummary file={collectionFile} />
        <div className="flex flex-wrap items-center gap-2 sm:self-start">
          <Dialog>
            <DialogTrigger
              render={
                <Button variant="outline" size="sm">
                  <HistoryIcon data-icon="inline-start" />
                  Action log
                  <Badge variant="secondary">{actionLog.length}</Badge>
                </Button>
              }
            />
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Action log</DialogTitle>
                <DialogDescription>
                  Every operator action recorded this session, most recent first.
                </DialogDescription>
              </DialogHeader>
              <ActionLog entries={actionLog} />
            </DialogContent>
          </Dialog>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant="outline" size="sm" onClick={handleSimulate}>
                  <RefreshCwIcon data-icon="inline-start" />
                  Simulate a new Collection File
                </Button>
              }
            />
            <TooltipContent>
              Discards the current collection file and generates a new random subset of loans.
              Operator decisions and the action log persist.
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <MetricsDashboard metrics={metrics} />

      <GroupedDecisionQueue
        rows={activeRows}
        awaitingRows={awaitingRows}
        collectedLoanIds={collectedLoanIds}
        rescheduledDueDates={rescheduledDueDates}
        contactedLoanIds={contactedLoanIds}
        onCollect={handleCollect}
        onBulkCollect={handleBulkCollect}
        onClearForRetry={handleClearForRetry}
        onStopPermanently={handleStopPermanently}
        onContactBorrower={handleContactBorrower}
        onReschedule={handleReschedule}
        onResolveAwaitingResponse={handleResolveAwaitingResponse}
      />
    </div>
  )
}
