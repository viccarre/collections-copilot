import { RetryQueueWorkspace } from "@/components/retry-queue-workspace"
import { COLLECTION_FILE_NOTE } from "@/lib/collection-file"

export default function Page() {
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Smart Retry System &middot; Stage 2 prototype
        </p>
        <h1 className="text-2xl font-semibold text-balance">Retry decisioning queue</h1>
        <p className="max-w-2xl text-sm text-pretty text-muted-foreground">
          Read-only view of the scoring engine&apos;s recommendation for every loan in today&apos;s
          simulated collection file. Nothing here has been sent &mdash; every retry still requires an
          explicit operator action in a later stage.
        </p>
        <p className="max-w-2xl text-xs text-pretty text-muted-foreground">{COLLECTION_FILE_NOTE}</p>
      </header>

      <RetryQueueWorkspace />
    </main>
  )
}
