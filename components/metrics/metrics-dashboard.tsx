"use client"

import { ChartBarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { OverdueAgeBreakdownCard } from "@/components/metrics/overdue-age-breakdown-card"
import { QueueCompositionCard } from "@/components/metrics/queue-composition-card"
import type { QueueMetrics } from "@/lib/metrics"

export function MetricsDashboard({ metrics }: { metrics: QueueMetrics }) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="-ml-2 gap-1.5 text-muted-foreground hover:text-foreground">
            <ChartBarIcon data-icon="inline-start" className="size-4" />
            Show metrics
          </Button>
        }
      />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Queue metrics</DialogTitle>
          <DialogDescription>A snapshot of the current queue&apos;s composition and exposure.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <QueueCompositionCard composition={metrics.composition} attemptsAvoided={metrics.attemptsAvoided} />
          <OverdueAgeBreakdownCard buckets={metrics.overdueAgeBreakdown} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
