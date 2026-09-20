"use client"

import { useMemo, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RetryDecisionBadge } from "@/components/retry-decision-badge"
import type { DecisionRow, RetryDecision } from "@/lib/scoring-engine"
import { cn } from "@/lib/utils"

const DECISION_FILTERS: Array<RetryDecision | "ALL"> = ["ALL", "YES", "HOLD", "NO"]

function formatTrackLabel(track: string): string {
  return track
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ")
}

export function DecisionQueueTable({ rows }: { rows: DecisionRow[] }) {
  const [filter, setFilter] = useState<RetryDecision | "ALL">("ALL")

  const filteredRows = useMemo(
    () => (filter === "ALL" ? rows : rows.filter((row) => row.retry_decision === filter)),
    [rows, filter],
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {filteredRows.length} of {rows.length} loans
        </p>
        <Select value={filter} onValueChange={(value) => setFilter(value as RetryDecision | "ALL")}>
          <SelectTrigger className="w-40" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {DECISION_FILTERS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option === "ALL" ? "All decisions" : option}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Loan ID</TableHead>
              <TableHead>Decision</TableHead>
              <TableHead>Treatment track</TableHead>
              <TableHead>Cadence</TableHead>
              <TableHead>Eligible today</TableHead>
              <TableHead className="text-right">Priority score</TableHead>
              <TableHead>Rationale</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.map((row) => (
              <TableRow key={row.loan_id}>
                <TableCell className="font-mono text-sm">{row.loan_id}</TableCell>
                <TableCell>
                  <RetryDecisionBadge decision={row.retry_decision} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatTrackLabel(row.treatment_track)}
                </TableCell>
                <TableCell className="text-sm">
                  {row.recommended_cadence_days === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    `${row.recommended_cadence_days}d`
                  )}
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      row.is_eligible_today ? "text-success" : "text-muted-foreground",
                    )}
                  >
                    {row.is_eligible_today ? "Yes" : "No"}
                  </span>
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {row.priority_score === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    row.priority_score.toFixed(2)
                  )}
                </TableCell>
                <TableCell className="max-w-md text-sm text-muted-foreground">
                  {row.rationale}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
