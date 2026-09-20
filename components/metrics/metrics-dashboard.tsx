import { AttemptsAvoidedCard } from "@/components/metrics/attempts-avoided-card"
import { ChargebackProtectionCard } from "@/components/metrics/chargeback-protection-card"
import { ChargebackRateBySegmentCard } from "@/components/metrics/chargeback-rate-by-segment-card"
import { QueueCompositionCard } from "@/components/metrics/queue-composition-card"
import { SessionActivityCard } from "@/components/metrics/session-activity-card"
import type { QueueMetrics } from "@/lib/metrics"

export function MetricsDashboard({ metrics }: { metrics: QueueMetrics }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <QueueCompositionCard composition={metrics.composition} />
        <AttemptsAvoidedCard attemptsAvoided={metrics.attemptsAvoided} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChargebackProtectionCard dollars={metrics.dollarsProtectedFromChargebackRisk} />
        <div className="lg:col-span-2">
          <ChargebackRateBySegmentCard segments={metrics.chargebackBySegment} />
        </div>
      </div>
      <SessionActivityCard activity={metrics.sessionActivity} />
    </div>
  )
}
