import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

export default function Stepper({ steps, current, onStepClick }) {
  return (
    <ol className="flex items-start overflow-x-auto pb-1" aria-label="Langkah pembuatan bot">
      {steps.map((label, index) => {
        const done = index < current
        const active = index === current
        const clickable = done && typeof onStepClick === 'function'
        return (
          <li key={label} className="relative flex min-w-20 flex-1 flex-col items-center gap-2.5">
            {index < steps.length - 1 ? (
              <span
                className={cn(
                  'absolute top-[17px] left-[calc(50%+20px)] right-[calc(-50%+20px)] h-0.5 rounded-full',
                  done ? 'bg-primary' : 'bg-border',
                )}
                aria-hidden="true"
              />
            ) : null}
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick(index)}
              className={cn(
                'relative flex size-9 items-center justify-center rounded-full border text-sm font-semibold outline-none transition-colors',
                clickable ? 'cursor-pointer' : 'cursor-default',
                done && 'border-primary bg-primary text-primary-foreground',
                active && 'border-primary bg-background text-primary ring-4 ring-primary/15',
                !done && !active && 'border-border bg-background text-muted-foreground',
              )}
              aria-current={active ? 'step' : undefined}
              aria-label={`Langkah ${index + 1}: ${label}`}
            >
              {done ? <Check className="size-4" aria-hidden="true" /> : index + 1}
            </button>
            <span
              className={cn(
                'max-w-28 truncate text-center text-xs font-medium',
                active ? 'text-foreground' : done ? 'text-foreground/80' : 'text-muted-foreground',
              )}
            >
              {label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
