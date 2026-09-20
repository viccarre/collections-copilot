"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ACTION_LABELS, type ActionLogEntry } from "@/lib/action-log"
import { cn } from "@/lib/utils"

const ACTION_BADGE_CLASS: Record<ActionLogEntry["action"], string> = {
  collected: "bg-success/15 text-success border-success/30",
  "cleared-for-retry": "bg-success/15 text-success border-success/30",
  stopped: "bg-destructive/15 text-destructive border-destructive/30",
  "contacted-borrower": "bg-primary/10 text-primary border-primary/30",
  rescheduled: "bg-warning/15 text-warning border-warning/30",
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "medium" })
}

/**
 * Plain content block for the session's action log -- rendered inside a
 * Dialog opened from the header, not its own page section. No internal
 * open/collapse state; the dialog owns visibility.
 */
export function ActionLog({ entries }: { entries: ActionLogEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-sm text-muted-foreground">
        No operator actions recorded yet this session.
      </p>
    )
  }

  return (
    <div className="max-h-[60vh] overflow-y-auto rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Loan ID</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Rationale</TableHead>
            <TableHead className="text-right">Timestamp</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="font-mono text-sm">{entry.loan_id}</TableCell>
              <TableCell>
                <span
                  className={cn(
                    "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
                    ACTION_BADGE_CLASS[entry.action],
                  )}
                >
                  {ACTION_LABELS[entry.action]}
                </span>
              </TableCell>
              <TableCell className="max-w-md whitespace-normal text-sm text-muted-foreground">
                {entry.rationale}
              </TableCell>
              <TableCell className="text-right text-sm whitespace-nowrap text-muted-foreground">
                {formatTimestamp(entry.timestamp)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
