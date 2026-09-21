"use client"

import { useState } from "react"
import {
  CalendarClockIcon,
  CheckIcon,
  CircleHelpIcon,
  HandCoinsIcon,
  MessageCircleIcon,
  OctagonXIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ReschedulePopover } from "@/components/queue/reschedule-popover"
import { cn, formatCurrency, FULL_BALANCE_ASSUMPTION_NOTE } from "@/lib/utils"
import type { EnrichedDecisionRow } from "@/lib/portfolio"
import type { TreatmentTrack } from "@/lib/scoring-engine"

// Tracks where the rationale already states a computed "next attempt due"
// date from cadence math -- these are eligible for a per-row manual
// reschedule override.
const RESCHEDULABLE_TRACKS = new Set<TreatmentTrack>(["standard_cadence", "cost_aware_throttle", "long_tail_dormant"])

// Tracks with a low enough success rate that reaching out to the borrower
// directly (instead of another blind automated attempt) is a reasonable
// alternative to offer per row.
const CONTACTABLE_TRACKS = new Set<TreatmentTrack>(["cost_aware_throttle", "long_tail_dormant"])

// Long-shot's rationale already points toward a manual write-off or
// legal-review decision -- give that track (and only that track) a
// one-click way to act on its own rationale. Standard/reduced cadence still
// route through Contact borrower or the Needs review tab instead.
const STOPPABLE_TRACKS = new Set<TreatmentTrack>(["long_tail_dormant"])

const YES_TRACK_ORDER: TreatmentTrack[] = [
  "new_unattempted",
  "post_success_standard",
  "standard_cadence",
  "cost_aware_throttle",
  "long_tail_dormant",
]

// Operator-facing labels -- avoid the model's internal track names.
const YES_TRACK_LABELS: Partial<Record<TreatmentTrack, string>> = {
  new_unattempted: "New / unattempted",
  post_success_standard: "Recently paid, standard cadence",
  standard_cadence: "Standard cadence",
  cost_aware_throttle: "Reduced cadence (low success rate)",
  long_tail_dormant: "Long-shot, rarely retried",
}

function EligibilityBadge({ eligible }: { eligible: boolean }) {
  return eligible ? (
    <Badge className="bg-success text-success-foreground">Yes</Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      No
    </Badge>
  )
}

function cadenceLabel(rows: EnrichedDecisionRow[]): string {
  const values = Array.from(
    new Set(rows.map((row) => row.recommended_cadence_days).filter((value): value is number => value !== null)),
  )
  if (values.length === 0) return "no fixed"
  if (values.length === 1) return `${values[0]}d`
  return `${Math.min(...values)}\u2013${Math.max(...values)}d`
}

interface YesSectionProps {
  rows: EnrichedDecisionRow[]
  collectedLoanIds: Set<number>
  rescheduledDueDates: Map<number, string>
  contactedLoanIds: Set<number>
  onCollect: (row: EnrichedDecisionRow) => void
  onBulkCollect: (rows: EnrichedDecisionRow[]) => void
  onContactBorrower: (row: EnrichedDecisionRow) => void
  onReschedule: (row: EnrichedDecisionRow, date: string) => void
  onStopPermanently: (row: EnrichedDecisionRow) => void
}

export function YesSection({
  rows,
  collectedLoanIds,
  rescheduledDueDates,
  contactedLoanIds,
  onCollect,
  onBulkCollect,
  onContactBorrower,
  onReschedule,
  onStopPermanently,
}: YesSectionProps) {
  // Every cadence track always gets a sub-tab, even when it has no loans
  // today -- an empty track is deemphasized (see isEmpty below) rather than
  // hidden, so the set of categories stays stable and predictable.
  const subgroups = YES_TRACK_ORDER.map((track) => ({
    track,
    rows: rows.filter((row) => row.treatment_track === track),
  }))
  const firstNonEmptyTrack = subgroups.find((group) => group.rows.length > 0)?.track ?? subgroups[0]?.track ?? ""

  const [activeTrack, setActiveTrack] = useState<string>(firstNonEmptyTrack)
  // If the previously active cadence group disappeared (e.g. a new file was
  // simulated), fall back to the first non-empty group instead of showing
  // a tab list with nothing selected.
  const selectedTrack = subgroups.some((group) => group.track === activeTrack) ? activeTrack : firstNonEmptyTrack

  return (
    <section className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Nothing collects automatically. Accept a cadence group in bulk, or collect loans one at a time.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No loans are ready to collect in this collection file.</p>
      ) : (
        <Tabs value={selectedTrack} onValueChange={setActiveTrack} className="gap-4">
          <div className="flex flex-col gap-1.5 border-l-2 border-border pl-3">
            <p className="text-xs text-muted-foreground">Within Ready to collect:</p>
            <TabsList className="h-7 w-fit gap-1 bg-muted/60 p-0.5">
              {subgroups.map(({ track, rows: groupRows }) => {
                const isEmpty = groupRows.length === 0
                return (
                  <TabsTrigger
                    key={track}
                    value={track}
                    className={cn("gap-1.5 px-2 py-0.5 text-xs font-normal", isEmpty && "text-muted-foreground/70")}
                  >
                    {YES_TRACK_LABELS[track] ?? track}
                    <Badge
                      variant={isEmpty ? "outline" : "secondary"}
                      className={cn("text-[10px]", isEmpty && "text-muted-foreground")}
                    >
                      {groupRows.length}
                    </Badge>
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>

          {subgroups.map(({ track, rows: groupRows }) => {
            if (groupRows.length === 0) {
              return (
                <TabsContent key={track} value={track}>
                  <p className="text-sm text-muted-foreground">
                    No loans in {YES_TRACK_LABELS[track] ?? track} today.
                  </p>
                </TabsContent>
              )
            }

            const uncollected = groupRows.filter((row) => !collectedLoanIds.has(row.loan_id))
            const uncollectedExposure = uncollected.reduce((sum, row) => sum + row.total_amount_outstanding, 0)

            return (
              <TabsContent key={track} value={track} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {groupRows.length} loan{groupRows.length !== 1 ? "s" : ""} &middot; {cadenceLabel(groupRows)}{" "}
                    cadence
                  </p>
                  {uncollected.length > 0 ? (
                    <Button size="sm" onClick={() => onBulkCollect(uncollected)}>
                      <HandCoinsIcon data-icon="inline-start" />
                      Collect all {uncollected.length} &middot; {cadenceLabel(uncollected)} cadence &middot;{" "}
                      {formatCurrency(uncollectedExposure)} total
                    </Button>
                  ) : (
                    <Badge variant="secondary">
                      <CheckIcon data-icon="inline-start" />
                      All collection started
                    </Badge>
                  )}
                </div>

                <div className="overflow-x-auto rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Loan ID</TableHead>
                        <TableHead>Bank</TableHead>
                        <TableHead>Eligible today</TableHead>
                        <TableHead className="text-right">
                          <span className="inline-flex items-center justify-end gap-1">
                            Exposure
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <span tabIndex={0} className="text-muted-foreground hover:text-foreground">
                                    <CircleHelpIcon className="size-3.5" />
                                    <span className="sr-only">Note on exposure amount</span>
                                  </span>
                                }
                              />
                              <TooltipContent className="max-w-sm" align="end">
                                {FULL_BALANCE_ASSUMPTION_NOTE}
                              </TooltipContent>
                            </Tooltip>
                          </span>
                        </TableHead>
                        <TableHead className="w-[45%]">Rationale</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupRows.map((row) => {
                        const collected = collectedLoanIds.has(row.loan_id)
                        const overrideDate = rescheduledDueDates.get(row.loan_id)
                        const canReschedule = RESCHEDULABLE_TRACKS.has(row.treatment_track)
                        const canContact = CONTACTABLE_TRACKS.has(row.treatment_track)
                        const canStop = STOPPABLE_TRACKS.has(row.treatment_track)
                        const wasContacted = contactedLoanIds.has(row.loan_id)
                        const computedDueDate = row.next_eligible_at ? row.next_eligible_at.slice(0, 10) : undefined
                        return (
                          <TableRow key={row.loan_id}>
                            <TableCell className="font-mono text-sm">
                              <div className="flex flex-col items-start gap-1">
                                {row.loan_id}
                                {overrideDate || wasContacted ? (
                                  <div className="flex flex-wrap gap-1">
                                    {overrideDate ? (
                                      <Badge
                                        variant="outline"
                                        className="gap-1 border-warning/30 font-normal text-warning"
                                      >
                                        <CalendarClockIcon className="size-3" />
                                        Rescheduled &rarr; {overrideDate}
                                      </Badge>
                                    ) : null}
                                    {wasContacted ? (
                                      <Badge
                                        variant="outline"
                                        className="gap-1 border-primary/30 font-normal text-primary"
                                      >
                                        <MessageCircleIcon className="size-3" />
                                        Contacted
                                      </Badge>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {row.payment_method_bank}
                            </TableCell>
                            <TableCell>
                              <EligibilityBadge eligible={row.is_eligible_today} />
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums">
                              {formatCurrency(row.total_amount_outstanding)}
                            </TableCell>
                            <TableCell className="max-w-md whitespace-normal text-sm text-muted-foreground">
                              <p>{row.rationale}</p>
                              {overrideDate ? (
                                <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
                                  <CalendarClockIcon className="size-3.5" />
                                  Next attempt due {overrideDate} &mdash; operator override
                                  {computedDueDate ? ` (model computed ${computedDueDate})` : null}
                                </p>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                {collected ? (
                                  <Badge variant="secondary">Collection started</Badge>
                                ) : (
                                  <Button size="sm" onClick={() => onCollect(row)}>
                                    <HandCoinsIcon data-icon="inline-start" />
                                    Collect
                                  </Button>
                                )}
                                {canReschedule ? (
                                  <ReschedulePopover
                                    loanId={row.loan_id}
                                    defaultDate={overrideDate ?? computedDueDate ?? ""}
                                    onReschedule={(date) => onReschedule(row, date)}
                                  />
                                ) : null}
                                {canContact ? (
                                  <Tooltip>
                                    <TooltipTrigger
                                      render={
                                        <Button
                                          size="icon-sm"
                                          variant="outline"
                                          onClick={() => onContactBorrower(row)}
                                        >
                                          <MessageCircleIcon />
                                          <span className="sr-only">Contact borrower</span>
                                        </Button>
                                      }
                                    />
                                    <TooltipContent>Contact borrower</TooltipContent>
                                  </Tooltip>
                                ) : null}
                                {canStop ? (
                                  <Button size="sm" variant="destructive" onClick={() => onStopPermanently(row)}>
                                    <OctagonXIcon data-icon="inline-start" />
                                    Stop permanently
                                  </Button>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            )
          })}
        </Tabs>
      )}
    </section>
  )
}
