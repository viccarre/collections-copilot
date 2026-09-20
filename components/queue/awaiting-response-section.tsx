"use client"

import { CircleHelpIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatCurrency, FULL_BALANCE_ASSUMPTION_NOTE } from "@/lib/utils"
import type { EnrichedDecisionRow } from "@/lib/portfolio"

/**
 * Placeholder note shown for every loan here -- this pass only implements
 * the button, the state transition, and the log entry. A future pass should
 * let the operator record the borrower's actual response and re-score the
 * loan with that context instead of leaving it parked indefinitely.
 */
const RESPONSE_PLACEHOLDER_NOTE =
  "Placeholder for a future flow: log the borrower's response here and re-score this loan with that context, instead of leaving it paused indefinitely."

interface AwaitingResponseSectionProps {
  rows: EnrichedDecisionRow[]
}

export function AwaitingResponseSection({ rows }: AwaitingResponseSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        An operator reached out to these borrowers directly instead of continuing automated retries. No real
        message goes out in this prototype &mdash; simulated only.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No loans are awaiting a borrower response right now.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loan ID</TableHead>
                <TableHead>Bank</TableHead>
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
                <TableHead className="w-[55%]">Rationale</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.loan_id}>
                  <TableCell className="font-mono text-sm">{row.loan_id}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.payment_method_bank}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {formatCurrency(row.total_amount_outstanding)}
                  </TableCell>
                  <TableCell className="max-w-md whitespace-normal text-sm text-muted-foreground">
                    <p>{row.rationale}</p>
                    <p className="mt-1.5 text-foreground/80">{RESPONSE_PLACEHOLDER_NOTE}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">Awaiting response</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}
