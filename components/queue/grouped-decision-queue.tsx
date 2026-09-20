"use client"

import { useMemo } from "react"
import { CircleHelpIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { YesSection } from "@/components/queue/yes-section"
import { HoldSection } from "@/components/queue/hold-section"
import { NoSection } from "@/components/queue/no-section"
import { AwaitingResponseSection } from "@/components/queue/awaiting-response-section"
import type { AwaitingResponseOutcome } from "@/components/queue/resolve-awaiting-popover"
import type { EnrichedDecisionRow } from "@/lib/portfolio"

function byExposureDesc(a: EnrichedDecisionRow, b: EnrichedDecisionRow): number {
  return b.total_amount_outstanding - a.total_amount_outstanding
}

// Operator-facing explanations for the three top-level decision buckets:
// why loans land there, and what the analyst is being asked to do about it.
const TOP_LEVEL_TAB_EXPLANATIONS = {
  yes: "The model recommends attempting collection on these loans today. They either have no failure history yet, recently succeeded, or are still within a productive retry window -- the data supports trying again now, though recovery odds vary a lot within this bucket (see each sub-tab).",
  hold: "These loans have a chargeback history and are paused for a human decision instead of being auto-approved for retry. A one-time, year-old chargeback reads very differently than several recent ones, so the model surfaces the chargeback count, dollar total, and recency and asks an analyst to judge whether it's safe to resume retries or better to stop.",
  no: "The model recommends against further automated retries on these loans -- either the last failure was a dead-end reason that will never succeed on this rail, or an operator explicitly stopped the loan. Continuing to attempt collection anyway would most likely fail again and, in the dead-reason case, may not be a valid retry at all; route these downstream instead.",
  awaiting:
    "These loans are paused because an operator reached out to the borrower directly instead of attempting another automated collection. This is simulated -- no real message goes out -- but it moves the record from blindly retrying and risking more chargeback exposure to human-in-the-loop, informed by whatever the borrower says back.",
} as const

interface GroupedDecisionQueueProps {
  rows: EnrichedDecisionRow[]
  awaitingRows: EnrichedDecisionRow[]
  collectedLoanIds: Set<number>
  rescheduledDueDates: Map<number, string>
  contactedLoanIds: Set<number>
  onCollect: (row: EnrichedDecisionRow) => void
  onBulkCollect: (rows: EnrichedDecisionRow[]) => void
  onClearForRetry: (row: EnrichedDecisionRow) => void
  onStopPermanently: (row: EnrichedDecisionRow) => void
  onContactBorrower: (row: EnrichedDecisionRow) => void
  onReschedule: (row: EnrichedDecisionRow, date: string) => void
  onResolveAwaitingResponse: (row: EnrichedDecisionRow, outcome: AwaitingResponseOutcome, note: string) => void
}

export function GroupedDecisionQueue({
  rows,
  awaitingRows,
  collectedLoanIds,
  rescheduledDueDates,
  contactedLoanIds,
  onCollect,
  onBulkCollect,
  onClearForRetry,
  onStopPermanently,
  onContactBorrower,
  onReschedule,
  onResolveAwaitingResponse,
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
          <Tooltip>
            <TooltipTrigger
              render={
                <span
                  tabIndex={0}
                  className="text-muted-foreground hover:text-foreground"
                  onClick={(event) => event.stopPropagation()}
                >
                  <CircleHelpIcon className="size-3.5" />
                  <span className="sr-only">What is Ready to collect?</span>
                </span>
              }
            />
            <TooltipContent className="max-w-sm">{TOP_LEVEL_TAB_EXPLANATIONS.yes}</TooltipContent>
          </Tooltip>
        </TabsTrigger>
        <TabsTrigger value="hold" className="gap-2 data-[state=active]:text-warning">
          Needs review
          <Badge variant="secondary">{holdRows.length}</Badge>
          <Tooltip>
            <TooltipTrigger
              render={
                <span
                  tabIndex={0}
                  className="text-muted-foreground hover:text-foreground"
                  onClick={(event) => event.stopPropagation()}
                >
                  <CircleHelpIcon className="size-3.5" />
                  <span className="sr-only">What is Needs review?</span>
                </span>
              }
            />
            <TooltipContent className="max-w-sm">{TOP_LEVEL_TAB_EXPLANATIONS.hold}</TooltipContent>
          </Tooltip>
        </TabsTrigger>
        <TabsTrigger value="no" className="gap-2 data-[state=active]:text-destructive">
          Not retrying
          <Badge variant="secondary">{noRows.length}</Badge>
          <Tooltip>
            <TooltipTrigger
              render={
                <span
                  tabIndex={0}
                  className="text-muted-foreground hover:text-foreground"
                  onClick={(event) => event.stopPropagation()}
                >
                  <CircleHelpIcon className="size-3.5" />
                  <span className="sr-only">What is Not retrying?</span>
                </span>
              }
            />
            <TooltipContent className="max-w-sm">{TOP_LEVEL_TAB_EXPLANATIONS.no}</TooltipContent>
          </Tooltip>
        </TabsTrigger>
        <TabsTrigger value="awaiting" className="gap-2 data-[state=active]:text-primary">
          Awaiting response
          <Badge variant="secondary">{awaitingRows.length}</Badge>
          <Tooltip>
            <TooltipTrigger
              render={
                <span
                  tabIndex={0}
                  className="text-muted-foreground hover:text-foreground"
                  onClick={(event) => event.stopPropagation()}
                >
                  <CircleHelpIcon className="size-3.5" />
                  <span className="sr-only">What is Awaiting response?</span>
                </span>
              }
            />
            <TooltipContent className="max-w-sm">{TOP_LEVEL_TAB_EXPLANATIONS.awaiting}</TooltipContent>
          </Tooltip>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="yes">
        <YesSection
          rows={yesRows}
          collectedLoanIds={collectedLoanIds}
          rescheduledDueDates={rescheduledDueDates}
          contactedLoanIds={contactedLoanIds}
          onCollect={onCollect}
          onBulkCollect={onBulkCollect}
          onContactBorrower={onContactBorrower}
          onReschedule={onReschedule}
          onStopPermanently={onStopPermanently}
        />
      </TabsContent>
      <TabsContent value="hold">
        <HoldSection
          rows={holdRows}
          onClearForRetry={onClearForRetry}
          onStopPermanently={onStopPermanently}
          onContactBorrower={onContactBorrower}
        />
      </TabsContent>
      <TabsContent value="no">
        <NoSection rows={noRows} onStopPermanently={onStopPermanently} />
      </TabsContent>
      <TabsContent value="awaiting">
        <AwaitingResponseSection rows={awaitingRows} onResolve={onResolveAwaitingResponse} />
      </TabsContent>
    </Tabs>
  )
}
