import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  CreditCard,
  FileText,
  MessageSquareText,
  QrCode,
  Share2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { cn, formatDate } from '@/lib/utils'

function ChecklistItem({ done, icon: Icon, title, description, to, actionLabel }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg',
          done ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning',
        )}
      >
        <Icon className="size-4.5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          {title}
          {done ? (
            <CheckCircle2 className="size-4 text-success" aria-label="Selesai" />
          ) : (
            <Circle className="size-4 text-muted-foreground" aria-label="Belum selesai" />
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      </div>
      <Button asChild variant={done ? 'ghost' : 'outline'} size="sm" className="shrink-0">
        <Link to={to}>{done ? 'Lihat' : actionLabel}</Link>
      </Button>
    </li>
  )
}

const GUIDE = [
  {
    icon: Share2,
    title: 'Bagikan tautan atau QR',
    text: 'Kirim ke pelanggan lewat WhatsApp, Instagram, atau cetak kode QR-nya.',
  },
  {
    icon: MessageSquareText,
    title: 'Pelanggan mulai mengobrol',
    text: 'Sekali ketuk, Telegram terbuka dan bot langsung menyapa pelanggan.',
  },
  {
    icon: FileText,
    title: 'Pantau pesanan',
    text: 'Pesanan yang masuk tercatat otomatis di tab Pesanan dan bisa diekspor.',
  },
]

export default function BotOverview() {
  const { bot } = useOutletContext()
  const [showPrompt, setShowPrompt] = useState(false)

  const { data: filesData } = useApi(`files:${bot.id}`, () =>
    apiFetch(`files:${bot.id}`, { url: `/api/files/${bot.id}` }),
  )
  const fileCount = filesData?.files?.length ?? 0

  const items = [
    {
      done: fileCount > 0,
      icon: FileText,
      title: 'Katalog produk',
      description:
        fileCount > 0
          ? `${fileCount} berkas terunggah`
          : 'Unggah daftar menu/produk agar bot bisa mencatat pesanan',
      to: 'berkas',
      actionLabel: 'Unggah',
    },
    {
      done: Boolean(bot.payment_info),
      icon: CreditCard,
      title: 'Info pembayaran',
      description: bot.payment_info
        ? 'Instruksi pembayaran sudah diatur'
        : 'Tulis cara bayar agar bot bisa membimbing pelanggan',
      to: 'pengaturan',
      actionLabel: 'Atur',
    },
    {
      done: Boolean(bot.qris_image_url),
      icon: QrCode,
      title: 'Gambar QRIS',
      description: bot.qris_image_url
        ? 'Gambar QRIS siap dikirim ke pelanggan'
        : 'Unggah QRIS agar bot bisa mengirimkannya saat diminta',
      to: 'pengaturan',
      actionLabel: 'Unggah',
    },
  ]

  const remaining = items.filter((item) => !item.done).length

  return (
    <div className="space-y-6">
      <section aria-labelledby="setup-title">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="setup-title" className="text-lg font-semibold">
            {remaining === 0 ? 'Bot Anda siap dipakai' : 'Siapkan bot Anda'}
          </h2>
          {remaining > 0 ? (
            <span className="rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning">
              {remaining} langkah lagi
            </span>
          ) : (
            <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
              Lengkap
            </span>
          )}
        </div>
        <ul className="space-y-2.5">
          {items.map((item) => (
            <ChecklistItem key={item.title} {...item} />
          ))}
        </ul>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-background p-5" aria-labelledby="guide-title">
          <h2 id="guide-title" className="font-semibold">
            Cara memakai bot
          </h2>
          <ol className="mt-4 space-y-4">
            {GUIDE.map((step, index) => (
              <li key={step.title} className="flex gap-3.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-xl border border-border bg-background p-5" aria-labelledby="info-title">
          <h2 id="info-title" className="font-semibold">
            Informasi bot
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Nama</dt>
              <dd className="text-right font-medium">{bot.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="text-right font-medium">{bot.status === 'active' ? 'Aktif' : 'Nonaktif'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Dibuat</dt>
              <dd className="text-right font-medium">{formatDate(bot.created_at)}</dd>
            </div>
          </dl>

          <div className="mt-5 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setShowPrompt((value) => !value)}
              className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              aria-expanded={showPrompt}
            >
              Lihat instruksi sistem
              <ChevronDown
                className={cn('size-4 transition-transform', showPrompt && 'rotate-180')}
                aria-hidden="true"
              />
            </button>
            {showPrompt ? (
              <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-muted/50 p-3 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
                {bot.system_prompt}
              </pre>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}
