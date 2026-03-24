import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function fmt(value: number, decimals = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function fmtCompact(value: number): string {
  if (Math.abs(value) >= 1e12) return `${fmt(value / 1e12)}T`
  if (Math.abs(value) >= 1e9)  return `${fmt(value / 1e9)}B`
  if (Math.abs(value) >= 1e6)  return `${fmt(value / 1e6)}M`
  return fmt(value)
}
