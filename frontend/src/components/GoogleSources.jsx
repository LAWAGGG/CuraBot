import { useEffect, useRef, useState } from 'react'
import { FileSpreadsheet, Folder, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { apiFetch, errorMessage, invalidate } from '@/lib/api'
import { useApi } from '@/hooks/useApi'

export default function GoogleSources({ bot, mode = 'full' }) {
  const key = `sources:${bot.id}`
  const { data, loading, refresh } = useApi(key, () => apiFetch(key, { url: `/api/bots/${bot.id}/sources` }))
  const [url, setUrl] = useState('')
  const [kind, setKind] = useState('sheet')
  const [busy, setBusy] = useState(false)
  const [details, setDetails] = useState({})
  const [syncing, setSyncing] = useState(null)
  const sources = data?.sources ?? []

  // ponytail: buka tab link -> sinkron semua otomatis + tiap 45 dtk (murah: backend cache 60 dtk)
  const sourcesRef = useRef([])
  sourcesRef.current = sources
  useEffect(() => {
    if (mode === 'input') return
    let cancelled = false
    const autoAll = async () => {
      if (document.hidden) return
      for (const s of sourcesRef.current) {
        if (cancelled) return
        try {
          const r = await apiFetch(null, { method: 'post', url: `/api/bots/${bot.id}/sources/${s.id}/sync?auto=1` })
          if (!cancelled) setDetails((d) => ({ ...d, [s.id]: { headers: r.headers ?? [], preview: r.preview ?? [], total_rows: r.total_rows ?? 0 } }))
        } catch { /* gagal -> last_error tampil di list */ }
      }
      if (!cancelled) {
        invalidate(key)
        try { await refresh() } catch { /* abaikan */ }
      }
    }
    if (!loading && sources.length > 0) autoAll()
    const timer = setInterval(autoAll, 45000)
    return () => { cancelled = true; clearInterval(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, loading, sources.length])

  const connect = async () => {
    if (!url.trim()) return toast.error('Tempel link Google dulu.')
    setBusy(true)
    try {
      await apiFetch(null, { method: 'post', url: `/api/bots/${bot.id}/sources`, data: { kind, url: url.trim() } })
      setUrl('')
      invalidate(key)
      await refresh()
      toast.success('Link terhubung.')
    } catch (e) {
      // ponytail: refresh biar list sinkron dgn DB (row gagal tidak disisakan / row sukses tetap tampil)
      invalidate(key)
      try { await refresh() } catch { /* abaikan */ }
      toast.error(errorMessage(e))
    } finally { setBusy(false) }
  }
  const sync = async (id) => {
    setSyncing(id)
    try {
      const r = await apiFetch(null, { method: 'post', url: `/api/bots/${bot.id}/sources/${id}/sync` })
      setDetails((d) => ({ ...d, [id]: { headers: r.headers ?? [], preview: r.preview ?? [], total_rows: r.total_rows ?? 0 } }))
      invalidate(key)
      await refresh()
      toast.success(`Sinkron ok: ${r.total_rows} baris. AI baca semua kolom otomatis.`)
    } catch (e) { toast.error(errorMessage(e)) } finally { setSyncing(null) }
  }
  const remove = async (id) => {
    try {
      await apiFetch(null, { method: 'delete', url: `/api/bots/${bot.id}/sources/${id}` })
      invalidate(key)
      await refresh()
      toast.success('Link dihapus.')
    } catch (e) { toast.error(errorMessage(e)) }
  }

  if (mode === 'input') {
    return (
      <section className="rounded-xl border border-border bg-background p-5" aria-labelledby="gsrc-title">
        <h2 id="gsrc-title" className="font-semibold">Google Sheets &amp; Drive</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Tempel link, share kesini sebagai data</p>
        <div className="mt-3 flex flex-col gap-2 md:flex-row">
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1.5 text-sm">
            <option value="sheet">Spreadsheet produk</option>
            <option value="drive_folder">Folder Drive gambar</option>
          </select>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://docs.google.com/... atau https://drive.google.com/..." className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
          <Button onClick={connect} disabled={busy}>Hubungkan</Button>
        </div>
      </section>
    )
  }

  if (loading && sources.length === 0) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14 rounded-lg" />
        <Skeleton className="h-14 rounded-lg" />
      </div>
    )
  }
  if (sources.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada link.</p>
  }
  return (
    <ul className="space-y-2">
      {sources.map((s, index) => {
        const Icon = s.kind === 'sheet' ? FileSpreadsheet : Folder
        return (
          <li
            key={s.id}
            style={{ animationDelay: `${index * 50}ms` }}
            className="rise rounded-xl border border-border bg-background px-4 py-3"
          >
            <div className="flex select-none items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4.5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" title={s.url}>
                  {s.kind === 'sheet' ? 'Spreadsheet' : 'Folder Drive'}
                </p>
                <p className="truncate text-xs text-muted-foreground" title={s.url}>
                  {s.last_error ? s.last_error : 'aktif'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => sync(s.id)}
                disabled={syncing === s.id}
                aria-label="Sinkronkan"
              >
                <RefreshCw aria-hidden="true" className={syncing === s.id ? 'animate-spin' : ''} />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => remove(s.id)}
                aria-label="Hapus link"
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
            {details[s.id] ? (
              <div className="mt-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                <p>AI baca semua kolom otomatis · {details[s.id].total_rows} baris</p>
                {details[s.id].headers?.length ? (
                  <p className="mt-0.5 truncate" title={details[s.id].headers.join(' | ')}>
                    Kolom: {details[s.id].headers.join(' | ')}
                  </p>
                ) : null}
                {details[s.id].preview?.length ? (
                  <p className="mt-0.5 truncate" title={details[s.id].preview.join(', ')}>
                    Isi: {details[s.id].preview.slice(0, 5).join(', ')}
                  </p>
                ) : null}
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
