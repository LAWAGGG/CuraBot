import { Inbox } from 'lucide-react'

export default function EmptyState({ icon: Icon = Inbox, image, imageAlt = '', title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
      {image ? (
        <img src={image} alt={imageAlt} className="size-14 shrink-0 object-contain" />
      ) : (
        <span className="flex size-14 items-center justify-center rounded-2xl bg-accent/60 text-accent-foreground">
          <Icon className="size-7" aria-hidden="true" />
        </span>
      )}
      <h2 className="mt-4 text-lg font-semibold text-foreground">{title}</h2>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
