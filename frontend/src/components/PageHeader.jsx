import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function PageHeader({ title, description, actions, backTo, className }) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {backTo ? (
          <Button asChild variant="ghost" size="icon-sm" className="mt-0.5 text-muted-foreground">
            <Link to={backTo} aria-label="Kembali">
              <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>
        ) : null}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
