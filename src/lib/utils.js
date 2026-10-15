import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function toCents(value) {
  const match = String(value ?? '')
    .trim()
    .replace(',', '.')
    .match(/^(\d+)(?:\.(\d{1,2}))?$/)

  if (!match) return 0

  return Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'))
}

export function formatMoney(cents) {
  const absolute = Math.abs(cents)
  const whole = Math.floor(absolute / 100)
  const decimals = String(absolute % 100).padStart(2, '0')

  return `${cents < 0 ? '-' : ''}Q${new Intl.NumberFormat('es-GT').format(whole)}.${decimals}`
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('es-GT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}
