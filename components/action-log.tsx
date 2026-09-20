"use client"

import { useState } from "react"
import { ChevronDownIcon, HistoryIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ACTION_LABELS, type ActionLogEntry } from "@/lib/action-log"
import { cn } from "@/lib/utils"

const ACTION_BADGE_CLASS: Record<ActionLogEntry["action"], string> = {
  collected: "bg-success/15 text-success border-success/30",
  "cleared-for-retry": "bg-success/15 text-success border-success/30",
  stopped: "bg-destructive/15 text-destructive border-destructive/30",
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "medium" })
}

export function ActionLog({ entries }: { entries: ActionLogEntry[] }) {
  const [open, setOpen] = useState(entries.length > 0)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border border-border">
      <CollapsibleTrigger
        render={<Button variant="ghost" className="h-auto w-full justify-between rounded-none px-4 py-3" />}
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <HistoryIcon data-icon="inline-start" />
          Action log
          <Badge variant="secondary">{entries.length}</Badge>
        </span>
        <ChevronDownIcon
          data-icon="inline-end"
          className={cn("transition-transform", open && "rotate-180")}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t border-border">
          {entries.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No operator actions recorded yet this session.
            </p>
          ) : (
            <div className="overflow-x-auto">
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
                            "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold",
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
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
