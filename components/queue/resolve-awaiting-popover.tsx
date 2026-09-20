"use client"

import { useState } from "react"
import { CircleCheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export type AwaitingResponseOutcome = "cleared" | "stopped"

interface ResolveAwaitingPopoverProps {
  loanId: number
  onResolve: (outcome: AwaitingResponseOutcome, note: string) => void
}

/**
 * Manual escape hatch for the Awaiting response tab -- until real
 * response-capture is built, this is the only way to move a contacted loan
 * forward. The note is a free-text log entry, not structured data.
 */
export function ResolveAwaitingPopover({ loanId, onResolve }: ResolveAwaitingPopoverProps) {
  const [open, setOpen] = useState(false)
  const [outcome, setOutcome] = useState<AwaitingResponseOutcome>("cleared")
  const [note, setNote] = useState("")

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setOutcome("cleared")
      setNote("")
    }
  }

  function handleSave() {
    onResolve(outcome, note)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button size="sm" variant="outline">
            <CircleCheckIcon data-icon="inline-start" />
            Resolve
          </Button>
        }
      />
      <PopoverContent align="end" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Resolve loan {loanId}</PopoverTitle>
          <PopoverDescription>
            Manual placeholder until response-capture is built &mdash; record what happened and move this loan
            forward instead of leaving it parked here indefinitely.
          </PopoverDescription>
        </PopoverHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`resolve-outcome-${loanId}`}>Outcome</Label>
          <Select value={outcome} onValueChange={(value) => setOutcome(value as AwaitingResponseOutcome)}>
            <SelectTrigger id={`resolve-outcome-${loanId}`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cleared">Clear for retry &rarr; Ready to collect</SelectItem>
              <SelectItem value="stopped">Stop permanently &rarr; Not retrying</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`resolve-note-${loanId}`}>What did the borrower say? (optional)</Label>
          <Textarea
            id={`resolve-note-${loanId}`}
            placeholder="Free-text log note, not structured data..."
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        <Button size="sm" onClick={handleSave}>
          Resolve loan
        </Button>
      </PopoverContent>
    </Popover>
  )
}
