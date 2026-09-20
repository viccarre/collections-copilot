import { CircleHelpIcon, FileTextIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatCurrency, FULL_BALANCE_ASSUMPTION_NOTE } from "@/lib/utils"
import type { SimulatedCollectionFile } from "@/lib/collection-file"

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function CollectionFileSummary({ file }: { file: SimulatedCollectionFile }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
      <span className="font-medium text-foreground tabular-nums">{file.loans.length} loans</span>
      <span aria-hidden="true">&middot;</span>
      <span>as of {file.asOf}</span>
      <span aria-hidden="true">&middot;</span>
      <span>generated {formatTimestamp(file.generatedAt)}</span>

      <Dialog>
        <DialogTrigger
          render={
            <Button variant="link" size="sm" className="h-auto gap-1 p-0 text-sm">
              <FileTextIcon data-icon="inline-start" className="size-3.5" />
              View raw file
            </Button>
          }
        />
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Raw collection file</DialogTitle>
            <DialogDescription>
              As of {file.asOf} &middot; generated {formatTimestamp(file.generatedAt)} &middot; {file.loans.length}{" "}
              loans. Fields exactly as they arrived, before scoring or history is joined in.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loan ID</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead className="text-right">Loan amount</TableHead>
                  <TableHead className="text-right">
                    <span className="inline-flex items-center justify-end gap-1">
                      Outstanding
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <span tabIndex={0} className="text-muted-foreground hover:text-foreground">
                              <CircleHelpIcon className="size-3.5" />
                              <span className="sr-only">Note on outstanding balance</span>
                            </span>
                          }
                        />
                        <TooltipContent className="max-w-sm" align="end">
                          {FULL_BALANCE_ASSUMPTION_NOTE}
                        </TooltipContent>
                      </Tooltip>
                    </span>
                  </TableHead>
                  <TableHead className="text-right">Overdue days</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {file.loans.map((loan) => (
                  <TableRow key={loan.loan_id}>
                    <TableCell className="font-mono text-sm">{loan.loan_id}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{loan.payment_method_bank}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {formatCurrency(loan.loan_amount)}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {formatCurrency(loan.total_amount_outstanding)}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {loan.overdue_days === null ? (
                        <span className="text-muted-foreground">&mdash;</span>
                      ) : (
                        loan.overdue_days
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
