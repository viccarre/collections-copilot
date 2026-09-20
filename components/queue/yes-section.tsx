"use client"

import { CheckIcon, SendIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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

const YES_TRACK_LABELS: Partial<Record<TreatmentTrack, string>> = {
  new_unattempted: "New / unattempted",
  post_success_standard: "Post-success standard",
  standard_cadence: "Standard cadence",
  cost_aware_throttle: "Cost-aware throttle",
  long_tail_dormant: "Long-tail dormant",
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
  sentLoanIds: Set<number>
  onSend: (row: EnrichedDecisionRow) => void
  onBulkSend: (rows: EnrichedDecisionRow[]) => void
}

export function YesSection({ rows, sentLoanIds, onSend, onBulkSend }: YesSectionProps) {
  const subgroups = YES_TRACK_ORDER.map((track) => ({
    track,
    rows: rows.filter((row) => row.treatment_track === track),
  })).filter((group) => group.rows.length > 0)

  return (
    <section className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Nothing sends automatically. Accept a cadence group in bulk, or send loans one at a time.
      </p>

      {subgroups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No YES loans in this collection file.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {subgroups.map(({ track, rows: groupRows }) => {
            const unsent = groupRows.filter((row) => !sentLoanIds.has(row.loan_id))
            const unsentExposure = unsent.reduce((sum, row) => sum + row.total_amount_outstanding, 0)

            return (
              <div key={track} className="flex flex-col gap-3 rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">{YES_TRACK_LABELS[track] ?? track}</h3>
                    <p className="text-xs text-muted-foreground">
                      {groupRows.length} loan{groupRows.length !== 1 ? "s" : ""} &middot; {cadenceLabel(groupRows)}{" "}
                      cadence
                    </p>
                  </div>
                  {unsent.length > 0 ? (
                    <Button size="sm" onClick={() => onBulkSend(unsent)}>
                      <SendIcon data-icon="inline-start" />
                      Send all {unsent.length} &middot; {cadenceLabel(unsent)} cadence &middot;{" "}
                      {formatCurrency(unsentExposure)} total
                    </Button>
                  ) : (
                    <Badge variant="secondary">
                      <CheckIcon data-icon="inline-start" />
                      All sent
                    </Badge>
                  )}
                </div>

                <div className="overflow-x-auto rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Loan ID</TableHead>
                        <TableHead>Bank</TableHead>
                        <TableHead className="text-right">Priority score</TableHead>
                        <TableHead className="text-right">Exposure</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupRows.map((row) => {
                        const sent = sentLoanIds.has(row.loan_id)
                        return (
                          <TableRow key={row.loan_id}>
                            <TableCell className="font-mono text-sm">{row.loan_id}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {row.payment_method_bank}
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
                            <TableCell className="text-right">
                              {sent ? (
                                <Badge variant="secondary">Sent</Badge>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => onSend(row)}>
                                  <SendIcon data-icon="inline-start" />
                                  Send
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
