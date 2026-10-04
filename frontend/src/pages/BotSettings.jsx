import { useRef, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { AlertTriangle, ImagePlus, KeyRound, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { AnimatePresence, motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { apiFetch, errorMessage, invalidate, uploadFile } from '@/lib/api'
import { formatBytes } from '@/lib/utils'

const MAX_QRIS_SIZE = 25 * 1024 * 1024

export default function BotSettings() {
  const { bot, refreshBot } = useOutletContext()
  const navigate = useNavigate()
  const qrisInputRef = useRef(null)

  const [name, setName] = useState(bot.name)
  const [systemPrompt, setSystemPrompt] = useState(bot.system_prompt)
  const [paymentInfo, setPaymentInfo] = useState(bot.payment_info ?? '')
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [qrisUploading, setQrisUploading] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  const dirty =
    name.trim() !== bot.name ||
    systemPrompt !== bot.system_prompt ||
    paymentInfo !== (bot.payment_info ?? '') ||
    apiKey.trim() !== ''

  const resetForm = () => {
    setName(bot.name)
    setSystemPrompt(bot.system_prompt)
    setPaymentInfo(bot.payment_info ?? '')
    setApiKey('')
  }

  const save = async (event) => {
    event.preventDefault()
    if (!name.trim()) {
      toast.error('Nama bot wajib diisi.')
      return
    }
    if (systemPrompt.trim().length < 10) {
      toast.error('Instruksi sistem minimal 10 karakter.')
      return
    }
    setSaving(true)
    try {
      await apiFetch(null, {
        method: 'put',
        url: `/api/bots/${bot.id}`,
        data: {
          name: name.trim(),
          system_prompt: systemPrompt,
          payment_info: paymentInfo,
          ...(apiKey.trim() ? { api_key: apiKey.trim() } : {}),
        },
      })
      invalidate('bots')
      invalidate(`bot:${bot.id}`)
      await refreshBot()
      setApiKey('')
      toast.success('Pengaturan bot disimpan.')
    } catch (caught) {
      toast.error(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  const uploadQris = async (file) => {
    if (!file) return
    const ext = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
      toast.error('Hanya gambar JPG atau PNG yang diizinkan.')
      return
    }
    if (file.size > MAX_QRIS_SIZE) {
      toast.error(`Gambar terlalu besar (maksimal ${formatBytes(MAX_QRIS_SIZE)}).`)
      return
    }
    setQrisUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      await uploadFile(`/api/bots/${bot.id}/qris`, formData)
      invalidate(`bot:${bot.id}`)
      await refreshBot()
      toast.success('Gambar QRIS diperbarui.')
    } catch (caught) {
      toast.error(errorMessage(caught))
    } finally {
      setQrisUploading(false)
    }
  }

  const deleteBot = async () => {
    if (deleteConfirm.trim() !== bot.name) return
    setDeleting(true)
    try {
      await apiFetch(null, { method: 'delete', url: `/api/bots/${bot.id}` })
      invalidate('bots')
      toast.success(`Bot "${bot.name}" dihapus.`)
      navigate('/', { replace: true })
    } catch (caught) {
      toast.error(errorMessage(caught))
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <form onSubmit={save} className="space-y-6">
        <section className="space-y-4 rounded-xl border border-border bg-background p-5">
          <h2 className="font-semibold">Informasi bot</h2>
          <div className="space-y-2">
            <Label htmlFor="bot-name">Nama bot</Label>
            <Input
              id="bot-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={255}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bot-prompt">Instruksi sistem</Label>
            <Textarea
              id="bot-prompt"
              rows={10}
              className="text-xs leading-relaxed"
              value={systemPrompt}
              onChange={(event) => setSystemPrompt(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Instruksi ini menentukan kepribadian dan aturan bot. Ubah dengan hati-hati agar bot
              tetap menjawab sesuai toko Anda.
            </p>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-background p-5">
          <div className="flex items-center gap-2">
            <KeyRound className="size-4.5 text-primary" aria-hidden="true" />
            <h2 className="font-semibold">Kunci API Gemini</h2>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bot-key">Ganti kunci API</Label>
            <Input
              id="bot-key"
              type="password"
              autoComplete="off"
              placeholder="Biarkan kosong bila tidak ingin mengganti"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Kunci disimpan terenkripsi dan tidak pernah ditampilkan kembali.
            </p>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-background p-5">
          <h2 className="font-semibold">Pembayaran</h2>
          <div className="space-y-2">
            <Label htmlFor="bot-payment">Info pembayaran (opsional)</Label>
            <Textarea
              id="bot-payment"
              rows={4}
              value={paymentInfo}
              onChange={(event) => setPaymentInfo(event.target.value)}
              placeholder="Contoh: Transfer BCA 1234567890 a.n. Toko Bu Sari. Setelah transfer, kirim bukti ya."
            />
            <p className="text-xs text-muted-foreground">
              Bot akan menyampaikan instruksi ini persis seperti yang Anda tulis saat pelanggan
              menanyakan cara bayar.
            </p>
          </div>

          <div className="space-y-3">
            <Label>Gambar QRIS (opsional)</Label>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {bot.qris_image_url ? (
                <img
                  src={bot.qris_image_url}
                  alt="Gambar QRIS toko"
                  className="h-40 w-40 rounded-xl border border-border object-contain p-1"
                />
              ) : (
                <div className="flex h-40 w-40 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 text-center text-xs text-muted-foreground">
                  Belum ada QRIS
                </div>
              )}
              <div>
                <input
                  ref={qrisInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  className="sr-only"
                  onChange={(event) => {
                    uploadQris(event.target.files?.[0])
                    event.target.value = ''
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => qrisInputRef.current?.click()}
                  disabled={qrisUploading}
                >
                  {qrisUploading ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : (
                    <ImagePlus aria-hidden="true" />
                  )}
                  {bot.qris_image_url ? 'Ganti Gambar QRIS' : 'Unggah Gambar QRIS'}
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  JPG/PNG, maksimal {formatBytes(MAX_QRIS_SIZE)}. Bot mengirim gambar ini saat
                  pelanggan meminta QRIS.
                </p>
              </div>
            </div>
          </div>
        </section>

      </form>

      <AnimatePresence>
        {dirty ? (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          className="fixed inset-x-0 bottom-5 z-50 flex justify-center px-4"
        >
          <div className="flex items-center gap-3 rounded-full border border-border bg-background/95 py-2 pr-2 pl-5 shadow-lg backdrop-blur">
            <p className="text-sm font-medium">Ada perubahan belum disimpan</p>
            <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
              Batal
            </Button>
            <Button type="button" size="sm" disabled={saving} onClick={(e) => {
                e.preventDefault()
                save(e)
              }}>
              {saving ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Save aria-hidden="true" />
              )}
              Simpan
            </Button>
          </div>
        </motion.div>
        ) : null}
      </AnimatePresence>

      <section className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="size-4.5" aria-hidden="true" />
          <h2 className="font-semibold">Zona bahaya</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Menghapus bot akan menonaktifkannya permanen. Pelanggan tidak bisa lagi mengobrol dengan
          bot ini.
        </p>
        <Button
          type="button"
          variant="destructive"
          onClick={() => {
            setDeleteConfirm('')
            setDeleteOpen(true)
          }}
          className="bg-destructive text-white hover:bg-destructive/90"
        >
          Hapus Bot
        </Button>
      </section>

      <AlertDialog open={deleteOpen} onOpenChange={(open) => (!deleting ? setDeleteOpen(open) : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus bot "{bot.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak bisa dibatalkan. Ketik nama bot untuk mengonfirmasi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirm}
            onChange={(event) => setDeleteConfirm(event.target.value)}
            placeholder={bot.name}
            aria-label="Ketik nama bot untuk konfirmasi"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting || deleteConfirm.trim() !== bot.name}
              onClick={deleteBot}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              Hapus Bot
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
