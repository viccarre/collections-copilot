"use client"

import { OctagonXIcon, PlayIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"
import type { EnrichedDecisionRow } from "@/lib/portfolio"

interface HoldSectionProps {
  rows: EnrichedDecisionRow[]
  onClearForRetry: (row: EnrichedDecisionRow) => void
  onStopPermanently: (row: EnrichedDecisionRow) => void
}

export function HoldSection({ rows, onClearForRetry, onStopPermanently }: HoldSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="text-lg font-semibold text-warning">HOLD &mdash; needs operator review</h2>
        <Badge variant="secondary">{rows.length}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        Chargeback signal on every loan below. Reviewed one at a time &mdash; no bulk actions here.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No HOLD loans in this collection file.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loan ID</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead className="text-right">Exposure</TableHead>
                <TableHead>Rationale</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                    {row.rationale}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => onClearForRetry(row)}>
                        <PlayIcon data-icon="inline-start" />
                        Clear for retry
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => onStopPermanently(row)}>
                        <OctagonXIcon data-icon="inline-start" />
                        Stop permanently
                      </Button>
                    </div>
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
