import { cn } from "cn"

function Skeleton({
  className,
  ...props
}) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-neutral-200/80", className)}
      {...props}
    />
  )
}

export { Skeleton }
