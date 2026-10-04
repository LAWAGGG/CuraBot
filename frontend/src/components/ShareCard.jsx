import { useRef } from 'react'
import { Download, Link2 } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { copyToClipboard } from '@/lib/utils'

export default function ShareCard({ name, link }) {
  const qrWrapRef = useRef(null)

  const download = () => {
    const canvas = qrWrapRef.current?.querySelector('canvas')
    if (!canvas) return
    const anchor = document.createElement('a')
    anchor.href = canvas.toDataURL('image/png')
    anchor.download = `qr-${(name || 'bot').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`
    anchor.click()
  }

  const copy = async () => {
    try {
      await copyToClipboard(link)
      toast.success('Tautan bot disalin.')
    } catch {
      toast.error('Gagal menyalin tautan.')
    }
  }

  return (
    <div className="grid gap-5 rounded-xl border border-primary/10 bg-background p-5 shadow-sm sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0 space-y-3">
        <div className="flex items-center gap-2">
          <Link2 className="size-4.5 text-primary" aria-hidden="true" />
          <h3 className="font-semibold">Bagikan bot ke pelanggan</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Kirim tautan ini atau minta pelanggan memindai kode QR untuk mulai mengobrol dengan bot Anda di
          Telegram.
        </p>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-sm" title={link}>
            {link || '—'}
          </span>
          <Button variant="outline" size="sm" onClick={copy} disabled={!link}>
            Salin
          </Button>
        </div>
      </div>
      <div className="flex flex-col items-center gap-3">
        <div ref={qrWrapRef} className="rounded-xl border border-border bg-white p-3">
          {link ? (
            <QRCodeCanvas value={link} size={148} marginSize={1} fgColor="#1B5E3F" />
          ) : (
            <div className="size-[148px]" />
          )}
        </div>
        <Button variant="outline" size="sm" onClick={download} disabled={!link}>
          <Download aria-hidden="true" />
          Unduh QR (PNG)
        </Button>
      </div>
    </div>
  )
}
