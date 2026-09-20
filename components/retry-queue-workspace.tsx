"use client"

import { useMemo, useState } from "react"
import { FileStackIcon, RefreshCwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { CollectionFileSummary } from "@/components/collection-file-summary"
import { QueueSummary } from "@/components/queue-summary"
import { DecisionQueueTable } from "@/components/decision-queue-table"
import { simulateCollectionFile, type SimulatedCollectionFile } from "@/lib/collection-file"
import { scoreCollectionFile } from "@/lib/portfolio"

export function RetryQueueWorkspace() {
  const [collectionFile, setCollectionFile] = useState<SimulatedCollectionFile | null>(null)

  const decisions = useMemo(
    () => (collectionFile ? scoreCollectionFile(collectionFile) : []),
    [collectionFile],
  )

  function handleSimulate() {
    setCollectionFile(simulateCollectionFile())
  }

  if (!collectionFile) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileStackIcon />
          </EmptyMedia>
          <EmptyTitle>No collection file loaded</EmptyTitle>
          <EmptyDescription>
            Simulate today&apos;s collection file to see which loans are due for retry and how the
            scoring engine treats each one. This stands in for the upstream lending-system feed --
            not a real bank feed in this prototype.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={handleSimulate}>
            <FileStackIcon data-icon="inline-start" />
            Simulate collection file
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CollectionFileSummary file={collectionFile} />
        <Button variant="outline" onClick={handleSimulate} className="sm:self-start">
          <RefreshCwIcon data-icon="inline-start" />
          Simulate new file
        </Button>
      </div>

      <QueueSummary rows={decisions} />
      <DecisionQueueTable rows={decisions} />
    </div>
  )
}
