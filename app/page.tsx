import { RetryQueueWorkspace } from "@/components/retry-queue-workspace"

export default function Page() {
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">Collections Copilot</h1>
      </header>

      <RetryQueueWorkspace />
    </main>
  )
}
