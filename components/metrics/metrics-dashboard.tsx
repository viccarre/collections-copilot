"use client"

import { useState } from "react"
import { ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { OverdueAgeBreakdownCard } from "@/components/metrics/overdue-age-breakdown-card"
import { QueueCompositionCard } from "@/components/metrics/queue-composition-card"
import { cn } from "@/lib/utils"
import type { QueueMetrics } from "@/lib/metrics"

export function MetricsDashboard({ metrics }: { metrics: QueueMetrics }) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        render={
          <Button variant="ghost" size="sm" className="-ml-2 gap-1.5 text-muted-foreground hover:text-foreground">
            <ChevronRightIcon className={cn("size-4 transition-transform", open && "rotate-90")} />
            {open ? "Hide metrics" : "Show metrics"}
          </Button>
        }
      />
      <CollapsibleContent>
        <div className="flex flex-col gap-4 pt-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <QueueCompositionCard composition={metrics.composition} attemptsAvoided={metrics.attemptsAvoided} />
            <OverdueAgeBreakdownCard buckets={metrics.overdueAgeBreakdown} />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
