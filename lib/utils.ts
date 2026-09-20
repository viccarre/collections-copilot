import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** "$1,800" style formatting for dollar-exposure display. */
export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
}
