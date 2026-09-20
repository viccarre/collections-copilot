import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** "$1,800" style formatting for dollar-exposure display. */
export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
}

/**
 * Documented simplification: this dataset has no installment-schedule or
 * next-payment-due data, so every dollar figure here (Outstanding, Exposure)
 * is the full remaining balance -- not a modeled "amount to attempt this
 * retry." A real collections system on installment loans would typically
 * retry for the next installment due, not the full balance.
 */
export const FULL_BALANCE_ASSUMPTION_NOTE =
  "This prototype treats the full outstanding balance as the amount attempted on each retry. Real installment-schedule / next-payment-due data was not available in this dataset, so this is a documented simplification, not a modeled next-payment amount."
