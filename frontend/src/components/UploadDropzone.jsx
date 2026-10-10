import { useRef, useState } from 'react'
import { FileText, UploadCloud, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { cn, formatBytes } from '@/lib/utils'

const DEFAULT_MAX_SIZE = 25 * 1024 * 1024

export default function UploadDropzone({
  value = [],
  onChange,
  accept = '.pdf,.docx,.doc,.xlsx',
  formatsLabel = 'PDF, DOCX, atau XLSX',
  maxFiles = 10,
  maxSize = DEFAULT_MAX_SIZE,
  disabled = false,
  hint,
}) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const allowed = accept.split(',').map((item) => item.trim().toLowerCase())

  const addFiles = (incoming) => {
    const next = [...value]
    for (const file of Array.from(incoming)) {
      if (next.length >= maxFiles) {
        toast.error(`Maksimal ${maxFiles} berkas.`)
        break
      }
      const ext = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`
      if (!allowed.includes(ext)) {
        toast.error(`"${file.name}" tidak didukung. Gunakan ${accept}.`)
        continue
      }
      if (file.size > maxSize) {
        toast.error(`"${file.name}" terlalu besar (maksimal ${formatBytes(maxSize)}).`)
        continue
      }
      if (next.some((item) => item.name === file.name && item.size === file.size)) {
        toast.error(`"${file.name}" sudah ada dalam daftar.`)
        continue
      }
      next.push(file)
    }
    onChange?.(next)
  }

  const removeAt = (index) => {
    onChange?.(value.filter((_, position) => position !== index))
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label="Pilih atau letakkan berkas katalog di sini"
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(event) => {
          if ((event.key === 'Enter' || event.key === ' ') && !disabled) {
            event.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          if (!disabled) addFiles(event.dataTransfer.files)
        }}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors',
          dragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/30',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-primary/40 hover:bg-primary/5',
        )}
      >
        <span className="flex size-11 items-center justify-center rounded-xl bg-accent/60 text-accent-foreground">
          <UploadCloud className="size-5.5" aria-hidden="true" />
        </span>
        <p className="text-sm font-medium">Letakkan berkas di sini atau klik untuk memilih</p>
        <p className="text-xs text-muted-foreground">
          {formatsLabel} · maksimal {formatBytes(maxSize)} per berkas · {value.length}/{maxFiles} terpilih
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="sr-only"
          disabled={disabled}
          onChange={(event) => {
            addFiles(event.target.files)
            event.target.value = ''
          }}
        />
      </div>

      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}

      {value.length > 0 ? (
        <ul className="space-y-2">
          {value.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5"
            >
              <FileText className="size-4.5 shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-sm" title={file.name}>
                {file.name}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(file.size)}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => removeAt(index)}
                disabled={disabled}
                aria-label={`Hapus ${file.name} dari daftar`}
              >
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
