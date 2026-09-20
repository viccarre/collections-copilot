import { FileTextIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"
import type { SimulatedCollectionFile } from "@/lib/collection-file"

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
  })
}

export function CollectionFileSummary({ file }: { file: SimulatedCollectionFile }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Collection file arrived
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <p className="text-2xl font-semibold tabular-nums">
            {file.loans.length} <span className="text-sm font-normal text-muted-foreground">loans</span>
          </p>
          <p className="text-sm text-muted-foreground">
            As of {file.asOf} &middot; generated {formatTimestamp(file.generatedAt)}
          </p>
        </div>

        <Dialog>
          <DialogTrigger
            render={
              <Button variant="outline" size="sm" className="self-start">
                <FileTextIcon data-icon="inline-start" />
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
                    <TableHead className="text-right">Outstanding</TableHead>
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
      </CardContent>
    </Card>
  )
}
