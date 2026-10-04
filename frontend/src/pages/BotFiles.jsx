import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { FileSpreadsheet, FileText, Loader2, RefreshCw, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import ConfirmDialog from '@/components/ConfirmDialog'
import EmptyState from '@/components/EmptyState'
import UploadDropzone from '@/components/UploadDropzone'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { apiFetch, errorMessage, invalidate, uploadFile } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { formatBytes, formatDateTime } from '@/lib/utils'

const MAX_FILES = 10

export default function BotFiles() {
  const { bot } = useOutletContext()
  const filesKey = `files:${bot.id}`

  const { data, loading, error, refresh } = useApi(filesKey, () =>
    apiFetch(filesKey, { url: `/api/files/${bot.id}` }),
  )
  const files = data?.files ?? []
  const remaining = Math.max(0, MAX_FILES - files.length)

  const [pending, setPending] = useState([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deletingBusy, setDeletingBusy] = useState(false)

  const uploadAll = async () => {
    if (pending.length === 0) return
    setUploading(true)
    let failed = 0
    for (let index = 0; index < pending.length; index += 1) {
      setProgress({ current: index + 1, total: pending.length, percent: 0 })
      const formData = new FormData()
      formData.append('bot_id', bot.id)
      formData.append('file', pending[index])
      try {
        await uploadFile('/api/files/upload', formData, {
          onProgress: (percent) =>
            setProgress({ current: index + 1, total: pending.length, percent }),
        })
      } catch (caught) {
        failed += 1
        toast.error(`${pending[index].name}: ${errorMessage(caught)}`)
      }
    }
    invalidate(filesKey)
    await refresh()
    setPending([])
    setUploading(false)
    setProgress(null)
    if (failed === 0) toast.success('Semua berkas berhasil diunggah.')
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setDeletingBusy(true)
    try {
      await apiFetch(null, { method: 'delete', url: `/api/files/${deleting.id}` })
      invalidate(filesKey)
      await refresh()
      toast.success(`"${deleting.filename}" dihapus.`)
      setDeleting(null)
    } catch (caught) {
      toast.error(errorMessage(caught))
    } finally {
      setDeletingBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-background p-5" aria-labelledby="upload-title">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 id="upload-title" className="font-semibold">
              Unggah berkas katalog
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Bot menjawab pertanyaan dan mencatat pesanan berdasarkan isi berkas ini.
            </p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {files.length}/{MAX_FILES} berkas
          </span>
        </div>

        {remaining === 0 ? (
          <p className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
            Batas maksimal {MAX_FILES} berkas sudah tercapai. Hapus berkas lama untuk mengunggah yang
            baru.
          </p>
        ) : (
          <>
            <UploadDropzone
              value={pending}
              onChange={setPending}
              maxFiles={remaining}
              disabled={uploading}
            />
            {pending.length > 0 ? (
              <div className="mt-4 space-y-3">
                {progress ? (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        Mengunggah {progress.current}/{progress.total}…
                      </span>
                      <span>{progress.percent}%</span>
                    </div>
                    <Progress value={progress.percent} />
                  </div>
                ) : null}
                <Button onClick={uploadAll} disabled={uploading}>
                  {uploading ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Upload aria-hidden="true" />
                  )}
                  Unggah {pending.length} Berkas
                </Button>
              </div>
            ) : null}
          </>
        )}
      </section>

      <section aria-labelledby="files-title">
        <h2 id="files-title" className="mb-3 font-semibold">
          Berkas terunggah
        </h2>

        {loading && !data ? (
          <div className="space-y-2">
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
            <Button variant="outline" size="sm" onClick={() => refresh()}>
              <RefreshCw aria-hidden="true" />
              Coba Lagi
            </Button>
          </div>
        ) : files.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Belum ada berkas"
            description="Unggah menu, daftar harga, atau informasi layanan agar bot bisa menjawab dengan akurat."
          />
        ) : (
          <ul className="space-y-2">
            {files.map((file) => {
              const isSheet = file.file_type === '.xlsx'
              const Icon = isSheet ? FileSpreadsheet : FileText
              return (
                <li
                  key={file.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" title={file.filename}>
                      {file.filename}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(file.file_size)} · {formatDateTime(file.created_at)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDeleting(file)}
                    aria-label={`Hapus ${file.filename}`}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => (!open ? setDeleting(null) : null)}
        title={`Hapus berkas "${deleting?.filename ?? ''}"?`}
        description="Bot tidak lagi memakai isi berkas ini sebagai sumber jawaban."
        confirmLabel="Hapus Berkas"
        onConfirm={confirmDelete}
        loading={deletingBusy}
      />
    </div>
  )
}
