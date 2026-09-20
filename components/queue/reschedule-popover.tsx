"use client"

import { useState } from "react"
import { CalendarClockIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ReschedulePopoverProps {
  loanId: number
  /** yyyy-mm-dd, the date to preselect when the popover opens. */
  defaultDate: string
}

/**
 * Manual override for a loan's next-attempt-due date -- for cases where an
 * operator knows something the model doesn't (e.g. the borrower said they
 * get paid on the 15th). This is a reminder only: nothing in this prototype
 * auto-fires on the picked date, the operator still has to come back and
 * click Collect themselves.
 */
export function ReschedulePopover({
  loanId,
  defaultDate,
  onReschedule,
}: ReschedulePopoverProps & { onReschedule: (date: string) => void }) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(defaultDate)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) setDate(defaultDate)
  }

  function handleSave() {
    if (!date) return
    onReschedule(date)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button size="sm" variant="outline">
            <CalendarClockIcon data-icon="inline-start" />
            Reschedule
          </Button>
        }
      />
      <PopoverContent align="end" className="w-72">
        <PopoverHeader>
          <PopoverTitle>Reschedule loan {loanId}</PopoverTitle>
          <PopoverDescription>
            Overrides the model&apos;s computed due date with your own pick. This is a manual reminder, not a
            promise of automated execution &mdash; you still need to come back and click Collect.
          </PopoverDescription>
        </PopoverHeader>
        <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <Button size="sm" onClick={handleSave} disabled={!date}>
          Save new date
        </Button>
      </PopoverContent>
    </Popover>
  )
}
