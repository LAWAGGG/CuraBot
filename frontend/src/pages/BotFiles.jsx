import { useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { FileSpreadsheet, FileText, Loader2, Pencil, RefreshCw, Trash2, Upload, X } from 'lucide-react'
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

const MAX_FILES = 10 // ponytail: mirror backend MAX_FILES_PER_BOT
const MAX_IMAGE_FILES = 50 // ponytail: mirror backend MAX_IMAGE_FILES_PER_BOT
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp']

export default function BotFiles() {
  const { bot } = useOutletContext()
  const filesKey = `files:${bot.id}`

  const { data, loading, error, refresh } = useApi(filesKey, () =>
    apiFetch(filesKey, { url: `/api/files/${bot.id}` }),
  )
  const files = data?.files ?? []
  const images = files.filter((f) => IMAGE_EXTS.includes((f.file_type ?? '').toLowerCase()))
  const docs = files.filter((f) => !IMAGE_EXTS.includes((f.file_type ?? '').toLowerCase()))
  const imageCount = images.length
  const docCount = docs.length
  const docRemaining = Math.max(0, MAX_FILES - docCount)
  const imageRemaining = Math.max(0, MAX_IMAGE_FILES - imageCount)

  const [pending, setPending] = useState([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deletingBusy, setDeletingBusy] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState(() => new Set())
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [labels, setLabels] = useState({})
  const [editing, setEditing] = useState(null)
  const [editLabel, setEditLabel] = useState('')
  const [viewing, setViewing] = useState(null)
  const [tab, setTab] = useState('docs')

  const uploadAll = async () => {
    if (pending.length === 0) return
    setUploading(true)
    let failed = 0
    for (let index = 0; index < pending.length; index += 1) {
      setProgress({ current: index + 1, total: pending.length, percent: 0 })
      const formData = new FormData()
      formData.append('bot_id', bot.id)
      formData.append('file', pending[index])
      formData.append('label', labels[index] ?? '')
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
    setLabels({})
    setUploading(false)
    setProgress(null)
    if (failed === 0) toast.success('Semua berkas berhasil diunggah.')
  }

  const lpTimer = useRef(null)
  const lpFired = useRef(false)
  const enterSelectWith = (id) => {
    setSelecting(true)
    setSelected((prev) => new Set(prev).add(id))
  }
  const startLP = (id) => {
    lpFired.current = false
    lpTimer.current = setTimeout(() => {
      lpFired.current = true
      if (!selecting) enterSelectWith(id)
      else toggleSelected(id)
    }, 500)
  }
  const cancelLP = () => clearTimeout(lpTimer.current)

  const toggleSelected = (id) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const activeList = tab === 'docs' ? docs : images
  const allActiveSelected = activeList.length > 0 && activeList.every((f) => selected.has(f.id))

  const toggleSelectAll = () =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (allActiveSelected) activeList.forEach((f) => next.delete(f.id))
      else activeList.forEach((f) => next.add(f.id))
      return next
    })

  const exitSelecting = () => {
    setSelecting(false)
    setSelected(new Set())
  }

  const confirmBulkDelete = async () => {
    setBulkBusy(true)
    try {
      const result = await apiFetch(null, {
        method: 'post',
        url: '/api/files/bulk-delete',
        data: { ids: [...selected] },
      })
      invalidate(filesKey)
      await refresh()
      toast.success(
        result.failed > 0
          ? `${result.deleted} berkas dihapus, ${result.failed} gagal.`
          : `${result.deleted} berkas dihapus.`,
      )
      setBulkConfirm(false)
      exitSelecting()
    } catch (caught) {
      toast.error(errorMessage(caught))
    } finally {
      setBulkBusy(false)
    }
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
            {docCount}/{MAX_FILES} dokumen · {imageCount}/{MAX_IMAGE_FILES} gambar
          </span>
        </div>

        {docRemaining === 0 && imageRemaining === 0 ? (
          <p className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
            Batas maksimal {MAX_FILES} dokumen dan {MAX_IMAGE_FILES} gambar sudah tercapai. Hapus berkas lama untuk mengunggah yang
            baru.
          </p>
        ) : (
          <>
            <UploadDropzone
              value={pending}
              onChange={setPending}
              maxFiles={docRemaining + imageRemaining}
              disabled={uploading}
              accept=".pdf,.docx,.doc,.xlsx,.jpg,.jpeg,.png,.webp"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Sisa: {docRemaining} dokumen · {imageRemaining} gambar
            </p>
            {pending.length > 0 ? (
              <div className="mt-4 space-y-3">
                {pending.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{file.name}</p>
                      <input
                        className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
                        placeholder="Label (opsional, mis. Baju Merah)"
                        value={labels[index] ?? ''}
                        onChange={(e) => setLabels((s) => ({ ...s, [index]: e.target.value }))}
                      />
                    </div>
                    <button type="button" onClick={() => setPending((p) => p.filter((_, i) => i !== index))} aria-label="Hapus">
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
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
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="files-title" className="font-semibold">
            Berkas terunggah
          </h2>
          <div className="flex items-center gap-2">
            {files.length > 0 ? (
              <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => (selecting ? exitSelecting() : setSelecting(true))}>
                {selecting ? 'Batal' : 'Pilih'}
              </Button>
            ) : null}
            <div className="relative grid grid-cols-2 rounded-lg border border-border bg-muted p-0.5 text-xs" role="tablist">
            <span
              aria-hidden="true"
              className="absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-md bg-background shadow-sm transition-transform duration-300 ease-out"
              style={{ transform: tab === 'images' ? 'translateX(100%)' : 'translateX(0)' }}
            />
            {[{ id: 'docs', label: `Berkas (${docCount})` }, { id: 'images', label: `Gambar (${imageCount})` }].map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`relative z-10 rounded-md px-3 py-1 transition-colors ${tab === t.id ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
              >
                {t.label}
              </button>
            ))}
            </div>
          </div>
        </div>

        {selecting ? (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={allActiveSelected}
                onChange={toggleSelectAll}
              />
              Pilih semua {tab === 'docs' ? 'berkas' : 'gambar'}
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{selected.size} terpilih</span>
              <Button variant="ghost" size="sm" className="sm:hidden" onClick={exitSelecting}>
                Batal
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={selected.size === 0}
                onClick={() => setBulkConfirm(true)}
              >
                <Trash2 aria-hidden="true" />
                Hapus ({selected.size})
              </Button>
            </div>
          </div>
        ) : null}

        {tab === 'docs' ? (loading && !data ? (
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
        ) : docs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Belum ada berkas"
            description="Unggah menu, daftar harga, atau informasi layanan agar bot bisa menjawab dengan akurat."
          />
        ) : (
          <ul className="space-y-2">
            {docs.map((file, index) => {
              const isSheet = file.file_type === '.xlsx'
              const Icon = isSheet ? FileSpreadsheet : FileText
              return (
                <li
                  key={file.id}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => {
                    if (lpFired.current) { lpFired.current = false; return }
                    if (selecting) toggleSelected(file.id)
                  }}
                  onPointerDown={() => startLP(file.id)}
                  onPointerUp={cancelLP}
                  onPointerLeave={cancelLP}
                  onPointerCancel={cancelLP}
                  onContextMenu={(e) => e.preventDefault()}
                  className={`rise flex select-none items-center gap-3 rounded-xl border bg-background px-4 py-3 ${selecting ? 'cursor-pointer' : ''} ${selecting && selected.has(file.id) ? 'border-primary ring-1 ring-primary' : 'border-border'}`}
                >
                  {selecting ? (
                    <input
                      type="checkbox"
                      aria-label={`Pilih ${file.filename}`}
                      className="size-5 shrink-0 rounded-md accent-primary"
                      checked={selected.has(file.id)}
                      onChange={() => toggleSelected(file.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : null}
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" title={file.label ?? file.filename}>
                      {file.label ?? file.filename}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(file.file_size)} · {formatDateTime(file.created_at)}
                    </p>
                  </div>
                  {!selecting ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => { setEditing(file); setEditLabel(file.label ?? file.filename) }}
                        aria-label="Edit label"
                      >
                        <Pencil aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleting(file)}
                        aria-label={`Hapus ${file.filename}`}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )) : (images.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada gambar.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {images.map((file, index) => (
              <li key={file.id} style={{ animationDelay: `${index * 50}ms` }} className="rise">
                <button
                  type="button"
                  onClick={() => {
                    if (lpFired.current) { lpFired.current = false; return }
                    if (selecting) toggleSelected(file.id)
                    else setViewing(file)
                  }}
                  onPointerDown={() => startLP(file.id)}
                  onPointerUp={cancelLP}
                  onPointerLeave={cancelLP}
                  onPointerCancel={cancelLP}
                  onContextMenu={(e) => e.preventDefault()}
                  className={`group relative block w-full select-none overflow-hidden rounded-xl border bg-background text-left ${selecting && selected.has(file.id) ? 'border-primary ring-1 ring-primary' : 'border-border'}`}
                  aria-label={selecting ? `Pilih ${file.label ?? file.filename}` : `Lihat ${file.label ?? file.filename}`}
                >
                  {selecting ? (
                    <input
                      type="checkbox"
                      aria-label={`Pilih ${file.filename}`}
                      className="absolute left-2 top-2 z-10 size-5 rounded-md accent-primary"
                      checked={selected.has(file.id)}
                      onChange={() => toggleSelected(file.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : null}
                  <img
                    src={file.media_url}
                    alt={file.label ?? file.filename}
                    loading="lazy"
                    className="aspect-square w-full object-cover transition group-hover:opacity-90"
                  />
                  <p className="truncate px-3 py-2 text-xs font-medium" title={file.label ?? file.filename}>
                    {file.label ?? file.filename}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        ))}
      </section>

      <ConfirmDialog
        open={bulkConfirm}
        onOpenChange={(open) => (!open ? setBulkConfirm(false) : null)}
        title={`Hapus ${selected.size} berkas?`}
        description="Bot tidak lagi memakai isi berkas ini sebagai sumber jawaban."
        confirmLabel="Hapus Berkas"
        onConfirm={confirmBulkDelete}
        loading={bulkBusy}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => (!open ? setDeleting(null) : null)}
        title={`Hapus berkas "${deleting?.filename ?? ''}"?`}
        description="Bot tidak lagi memakai isi berkas ini sebagai sumber jawaban."
        confirmLabel="Hapus Berkas"
        onConfirm={confirmDelete}
        loading={deletingBusy}
      />

      {viewing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setViewing(null)}>
          <div className="w-full max-w-2xl space-y-3 rounded-xl border border-border bg-background p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-sm">{viewing.label ?? viewing.filename}</h3>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(viewing.file_size)} · {formatDateTime(viewing.created_at)}
                </p>
              </div>
              <button type="button" onClick={() => setViewing(null)} aria-label="Tutup">
                <X className="size-4" />
              </button>
            </div>
            <img src={viewing.media_url} alt={viewing.label ?? viewing.filename} className="max-h-[70vh] w-full rounded-lg object-contain" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setEditing(viewing); setEditLabel(viewing.label ?? viewing.filename); setViewing(null) }}>
                <Pencil aria-hidden="true" /> Edit Label
              </Button>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => { setDeleting(viewing); setViewing(null) }}>
                <Trash2 aria-hidden="true" /> Hapus
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={viewing.media_url} target="_blank" rel="noreferrer">Buka</a>
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-80 rounded-xl border border-border bg-background p-4 space-y-3">
            <h3 className="font-semibold text-sm">Edit label</h3>
            <input className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                   value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>Batal</Button>
              <Button onClick={async () => {
                try {
                  await apiFetch(null, { method: 'patch', url: `/api/files/${editing.id}`, data: { label: editLabel } })
                  invalidate(filesKey); await refresh()
                  toast.success('Label diperbarui.')
                  setEditing(null)
                } catch (e) { toast.error(errorMessage(e)) }
              }}>Simpan</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
