"use client"

import { useState } from "react"
import { CheckIcon, CircleHelpIcon, HandCoinsIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatCurrency } from "@/lib/utils"
import type { EnrichedDecisionRow } from "@/lib/portfolio"
import type { TreatmentTrack } from "@/lib/scoring-engine"

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

// Operator-facing explanations for each YES sub-track: what the segment
// means, why the model still recommends retrying, and what to expect if
// this loan is collected on today.
const YES_TRACK_EXPLANATIONS: Partial<Record<TreatmentTrack, string>> = {
  new_unattempted:
    "No retry attempts have ever been made on this loan. The model always recommends a first attempt immediately -- there's no failure history yet to suggest it won't work. Expect a normal first-attempt outcome: most first attempts either succeed or fail with insufficient funds; a minority chargeback or hit a dead reason.",
  post_success_standard:
    "The loan's most recent attempt succeeded. Rather than assuming the debt is fully resolved, the model resumes it on the standard 3-day cadence in case this was a partial/installment payment. Expect a relatively high chance of another success, but confirm with Belvo whether this loan is single-payoff or installment -- if single-payoff, this loan should have already been closed out.",
  standard_cadence:
    "The loan has failed on insufficient funds, but its current failure streak is still short (below the standard-cadence ceiling), so the historical success rate at this streak is still meaningful. Expect a moderate chance of recovering something -- this is the highest-value bucket of the four failure-based tracks.",
  cost_aware_throttle:
    "The failure streak has crossed into territory where the historical success rate has crashed to roughly 1% or less. The model still says retry, but slows the cadence (5/10/14 days, based on loan size) so the operation doesn't burn attempts on a loan that rarely pays. Expect most attempts here to fail again; a small number will recover, weighted toward larger loans which get retried most often.",
  long_tail_dormant:
    "The failure streak is extremely long -- historical recovery at this point is negligible. The loan is still technically retryable, so it isn't marked NO, but it's cadence-stretched to every 30 days and separated from the throttle bucket so an operator can make a deliberate write-off or legal-review call. Expect collecting here to rarely succeed; treat any success as a bonus, not the expectation.",
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
  onCollect: (row: EnrichedDecisionRow) => void
  onBulkCollect: (rows: EnrichedDecisionRow[]) => void
}

export function YesSection({ rows, collectedLoanIds, onCollect, onBulkCollect }: YesSectionProps) {
  const subgroups = YES_TRACK_ORDER.map((track) => ({
    track,
    rows: rows.filter((row) => row.treatment_track === track),
  })).filter((group) => group.rows.length > 0)

  const [activeTrack, setActiveTrack] = useState<string>(subgroups[0]?.track ?? "")
  // If the previously active cadence group disappeared (e.g. a new file was
  // simulated), fall back to the first available group instead of showing
  // a tab list with nothing selected.
  const selectedTrack = subgroups.some((group) => group.track === activeTrack)
    ? activeTrack
    : subgroups[0]?.track ?? ""

  return (
    <section className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Nothing collects automatically. Accept a cadence group in bulk, or collect loans one at a time.
      </p>

      {subgroups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No loans are ready to collect in this collection file.</p>
      ) : (
        <Tabs value={selectedTrack} onValueChange={setActiveTrack} className="gap-4">
          <TabsList>
            {subgroups.map(({ track, rows: groupRows }) => (
              <TabsTrigger key={track} value={track} className="gap-2">
                {YES_TRACK_LABELS[track] ?? track}
                <Badge variant="secondary">{groupRows.length}</Badge>
                {YES_TRACK_EXPLANATIONS[track] ? (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span
                          tabIndex={0}
                          className="text-muted-foreground hover:text-foreground"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <CircleHelpIcon className="size-3.5" />
                          <span className="sr-only">What is {YES_TRACK_LABELS[track] ?? track}?</span>
                        </span>
                      }
                    />
                    <TooltipContent className="max-w-sm">{YES_TRACK_EXPLANATIONS[track]}</TooltipContent>
                  </Tooltip>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>

          {subgroups.map(({ track, rows: groupRows }) => {
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
                      All collected
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
                            Priority score
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <span tabIndex={0} className="text-muted-foreground hover:text-foreground">
                                    <CircleHelpIcon className="size-3.5" />
                                    <span className="sr-only">What is priority score?</span>
                                  </span>
                                }
                              />
                              <TooltipContent className="max-w-sm" align="end">
                                Expected dollars recovered per attempt at this loan&apos;s failure streak (net of
                                expected chargeback loss), scaled by how much is outstanding relative to a typical
                                loan. Higher means: worth attempting sooner if capacity is limited. It is not a
                                probability or a dollar amount on its own.
                              </TooltipContent>
                            </Tooltip>
                          </span>
                        </TableHead>
                        <TableHead className="text-right">Exposure</TableHead>
                        <TableHead>Rationale</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupRows.map((row) => {
                        const collected = collectedLoanIds.has(row.loan_id)
                        return (
                          <TableRow key={row.loan_id}>
                            <TableCell className="font-mono text-sm">{row.loan_id}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {row.payment_method_bank}
                            </TableCell>
                            <TableCell>
                              <EligibilityBadge eligible={row.is_eligible_today} />
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums">
                              {row.priority_score === null ? (
                                <span className="text-muted-foreground">&mdash;</span>
                              ) : (
                                row.priority_score.toFixed(2)
                              )}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums">
                              {formatCurrency(row.total_amount_outstanding)}
                            </TableCell>
                            <TableCell className="max-w-md whitespace-normal text-sm text-muted-foreground">
                              {row.rationale}
                            </TableCell>
                            <TableCell className="text-right">
                              {collected ? (
                                <Badge variant="secondary">Collected</Badge>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => onCollect(row)}>
                                  <HandCoinsIcon data-icon="inline-start" />
                                  Collect
                                </Button>
                              )}
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
