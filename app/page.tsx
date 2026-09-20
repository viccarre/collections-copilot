import { DecisionQueueTable } from "@/components/decision-queue-table"
import { QueueSummary } from "@/components/queue-summary"
import { getPortfolioDecisions, SEED_AS_OF, SEED_SAMPLE_NOTE } from "@/lib/portfolio"

export default function Page() {
  const decisions = getPortfolioDecisions()
  const asOfLabel = SEED_AS_OF.toISOString().slice(0, 10)

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Smart Retry System &middot; Stage 1 prototype
        </p>
        <h1 className="text-2xl font-semibold text-balance">Retry decisioning queue</h1>
        <p className="max-w-2xl text-sm text-pretty text-muted-foreground">
          Read-only view of the scoring engine&apos;s recommendation for every loan in today&apos;s
          simulated collection file, as of {asOfLabel}. Nothing here has been sent &mdash; every retry
          still requires an explicit operator action in a later stage.
        </p>
        <p className="max-w-2xl text-xs text-pretty text-muted-foreground">{SEED_SAMPLE_NOTE}</p>
      </header>

      <QueueSummary rows={decisions} />
      <DecisionQueueTable rows={decisions} />
    </main>
  )
}
