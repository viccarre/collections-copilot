"use client"

import { OctagonXIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"
import type { EnrichedDecisionRow } from "@/lib/portfolio"

function trackLabel(track: string): string {
  return track === "operator_stop" ? "Operator stop" : "Write-off candidate"
}

interface NoSectionProps {
  rows: EnrichedDecisionRow[]
  onStopPermanently: (row: EnrichedDecisionRow) => void
}

export function NoSection({ rows, onStopPermanently }: NoSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Mostly read-only. An operator can still record an explicit, logged stop so a loan can&apos;t
        re-enter consideration if its history changes on a future file.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No NO loans in this collection file.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loan ID</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Track</TableHead>
                <TableHead className="text-right">Exposure</TableHead>
                <TableHead>Rationale</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const alreadyStopped = row.treatment_track === "operator_stop"
                return (
                  <TableRow key={row.loan_id}>
                    <TableCell className="font-mono text-sm">{row.loan_id}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.payment_method_bank}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{trackLabel(row.treatment_track)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {formatCurrency(row.total_amount_outstanding)}
                    </TableCell>
                    <TableCell className="max-w-md whitespace-normal text-sm text-muted-foreground">
                      {row.rationale}
                    </TableCell>
                    <TableCell className="text-right">
                      {alreadyStopped ? (
                        <Badge variant="secondary">Stopped</Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground"
                          onClick={() => onStopPermanently(row)}
                        >
                          <OctagonXIcon data-icon="inline-start" />
                          Stop permanently
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}
