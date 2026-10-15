import { cn } from '@/lib/utils'

function Card({ className, ...props }) {
  return <section className={cn('rounded-2xl border border-slate-200 bg-white shadow-sm', className)} {...props} />
}

function CardHeader({ className, ...props }) {
  return <div className={cn('flex flex-col gap-1 p-5 pb-0', className)} {...props} />
}

function CardTitle({ className, ...props }) {
  return <h2 className={cn('text-base font-semibold text-slate-900', className)} {...props} />
}

function CardDescription({ className, ...props }) {
  return <p className={cn('text-sm text-slate-500', className)} {...props} />
}

function CardContent({ className, ...props }) {
  return <div className={cn('p-5', className)} {...props} />
}

export { Card, CardContent, CardDescription, CardHeader, CardTitle }
