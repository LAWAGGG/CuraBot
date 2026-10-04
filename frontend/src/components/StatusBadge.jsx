import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const STATUS_MAP = {
  active: { label: 'Aktif', className: 'border-success/20 bg-success/10 text-success' },
  inactive: { label: 'Nonaktif', className: 'border-border bg-muted text-muted-foreground' },
  pending: { label: 'Menunggu', className: 'border-warning/25 bg-warning/10 text-warning' },
  incomplete: { label: 'Belum lengkap', className: 'border-warning/25 bg-warning/10 text-warning' },
  confirmed: { label: 'Dikonfirmasi', className: 'border-info/25 bg-info/10 text-info' },
  shipped: { label: 'Dikirim', className: 'border-info/25 bg-info/10 text-info' },
  completed: { label: 'Selesai', className: 'border-success/20 bg-success/10 text-success' },
  rejected: { label: 'Ditolak', className: 'border-destructive/25 bg-destructive/10 text-destructive' },
}

export default function StatusBadge({ status, className }) {
  const item = STATUS_MAP[status] ?? {
    label: status ?? '—',
    className: 'border-border bg-muted text-muted-foreground',
  }
  return (
    <Badge variant="outline" className={cn('font-medium', item.className, className)}>
      {item.label}
    </Badge>
  )
}
