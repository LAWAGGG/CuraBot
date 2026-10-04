import { cn } from '@/lib/utils'

export default function StatCard({ label, value, hint, icon: Icon, accent = 'primary' }) {
  const accentClass =
    {
      primary: 'bg-primary/10 text-primary',
      success: 'bg-success/10 text-success',
      info: 'bg-info/10 text-info',
      warning: 'bg-warning/10 text-warning',
    }[accent] ?? 'bg-primary/10 text-primary'

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon ? (
          <span className={cn('flex size-8 items-center justify-center rounded-lg', accentClass)}>
            <Icon className="size-4" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
