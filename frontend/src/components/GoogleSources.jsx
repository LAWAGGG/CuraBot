import { useState } from 'react'
import { FileSpreadsheet, Folder, Loader2, RefreshCw, Trash2 } from 'lucide-react'
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
  const [saving, setSaving] = useState(null)
  const [syncing, setSyncing] = useState(null)
  const sources = data?.sources ?? []
  const COLS = [['name_col', 'Nama'], ['price_col', 'Harga'], ['stock_col', 'Stok'], ['image_col', 'Gambar']]

  const connect = async () => {
    if (!url.trim()) return toast.error('Tempel link Google dulu.')
    setBusy(true)
    try {
      await apiFetch(null, { method: 'post', url: `/api/bots/${bot.id}/sources`, data: { kind, url: url.trim() } })
      setUrl('')
      invalidate(key)
      await refresh()
      toast.success('Link terhubung.')
    } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(false) }
  }
  const sync = async (id) => {
    setSyncing(id)
    try {
      const r = await apiFetch(null, { method: 'post', url: `/api/bots/${bot.id}/sources/${id}/sync` })
      if (r.headers) setDetails((d) => ({ ...d, [id]: { headers: r.headers, mapping: r.mapping ?? {} } }))
      invalidate(key)
      await refresh()
      toast.success(`Sinkron ok: ${r.total_rows} baris.`)
    } catch (e) { toast.error(errorMessage(e)) } finally { setSyncing(null) }
  }
  const saveMapping = async (id, colKey, val) => {
    setSaving(id)
    try {
      const updated = await apiFetch(null, { method: 'patch', url: `/api/bots/${bot.id}/sources/${id}`, data: { [colKey]: val === '' ? null : Number(val) } })
      setDetails((d) => ({ ...d, [id]: { headers: d[id]?.headers ?? [], mapping: updated.mapping ?? {} } }))
      invalidate(key)
      await refresh()
      toast.success('Petakan kolom tersimpan.')
    } catch (e) { toast.error(errorMessage(e)) } finally { setSaving(null) }
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
            {s.kind === 'sheet' && details[s.id] ? (
              <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                {COLS.map(([colKey, label]) => (
                  <label key={colKey} className="text-xs text-muted-foreground">
                    {label}
                    <select
                      value={details[s.id].mapping?.[colKey] ?? ''}
                      disabled={saving === s.id}
                      onChange={(e) => saveMapping(s.id, colKey, e.target.value)}
                      className="mt-0.5 w-full rounded-md border border-border bg-background px-1.5 py-1 text-sm text-foreground"
                    >
                      <option value="">—</option>
                      {details[s.id].headers.map((h, i) => (
                        <option key={i} value={i}>{h || `Kolom ${i + 1}`}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
