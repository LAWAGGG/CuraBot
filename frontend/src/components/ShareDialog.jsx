import { useRef } from 'react'
import { Copy, Download, ExternalLink, Link2 } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { copyToClipboard } from '@/lib/utils'

export default function ShareDialog({ open, onOpenChange, name, link }) {
  const qrWrapRef = useRef(null)

  const copy = async () => {
    try {
      await copyToClipboard(link)
      toast.success('Tautan bot disalin.')
    } catch {
      toast.error('Gagal menyalin tautan.')
    }
  }

  const download = () => {
    const canvas = qrWrapRef.current?.querySelector('canvas')
    if (!canvas) return
    const anchor = document.createElement('a')
    anchor.href = canvas.toDataURL('image/png')
    anchor.download = `qr-${(name || 'bot').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`
    anchor.click()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="size-4 text-primary" aria-hidden="true" />
            Bagikan bot ke pelanggan
          </DialogTitle>
          <DialogDescription>
            Kirim tautan ini atau minta pelanggan memindai kode QR untuk mulai mengobrol dengan bot
            Anda di Telegram.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-sm" title={link}>
            {link || '—'}
          </span>
          <Button variant="outline" size="sm" onClick={copy} disabled={!link}>
            <Copy aria-hidden="true" />
            Salin
          </Button>
        </div>
        <div className="flex flex-col items-center gap-3">
          <div ref={qrWrapRef} className="rounded-xl border border-border bg-white p-3">
            {link ? (
              <QRCodeCanvas value={link} size={160} marginSize={1} fgColor="#1B5E3F" />
            ) : (
              <div className="size-[160px]" />
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" size="sm" onClick={download} disabled={!link}>
              <Download aria-hidden="true" />
              Unduh QR
            </Button>
            <Button asChild size="sm">
              <a href={link} target="_blank" rel="noreferrer">
                <ExternalLink aria-hidden="true" />
                Buka di Telegram
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
