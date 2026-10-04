import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

export default function Stepper({ steps, current, onStepClick }) {
  return (
    <ol className="flex items-start gap-1.5 sm:gap-2" aria-label="Langkah pembuatan bot">
      {steps.map((label, index) => {
        const done = index < current
        const active = index === current
        const clickable = done && typeof onStepClick === 'function'
        return (
          <li key={label} className="flex min-w-0 flex-1 flex-col gap-2">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick(index)}
              className={cn(
                'flex items-center gap-2 text-left outline-none',
                clickable ? 'cursor-pointer' : 'cursor-default',
              )}
              aria-current={active ? 'step' : undefined}
              aria-label={`Langkah ${index + 1}: ${label}`}
            >
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
                  done && 'border-primary bg-primary text-primary-foreground',
                  active && 'border-primary bg-primary/10 text-primary',
                  !done && !active && 'border-border bg-muted text-muted-foreground',
                )}
              >
                {done ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
              </span>
              <span
                className={cn(
                  'hidden truncate text-xs font-medium sm:block',
                  active ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
            </button>
            <span
              className={cn(
                'h-1 rounded-full transition-colors',
                done || active ? 'bg-primary' : 'bg-muted',
              )}
              aria-hidden="true"
            />
          </li>
        )
      })}
    </ol>
  )
}
