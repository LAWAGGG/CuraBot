import { useState } from 'react'
import { ExternalLink, Info } from 'lucide-react'

import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getSettings, saveSettings } from '@/lib/settings'

const FONT_SIZES = [
  { value: 14, label: 'Kecil' },
  { value: 16, label: 'Sedang' },
  { value: 18, label: 'Besar' },
]

export default function Settings() {
  const [settings, setSettings] = useState(getSettings)

  const update = (patch) => setSettings(saveSettings(patch))

  return (
    <div className="w-full space-y-6">
      <PageHeader title="Pengaturan" description="Sesuaikan preferensi dan lihat informasi proyek." />

      <section className="rounded-xl border border-border bg-background p-5">
        <h2 className="font-semibold">Tampilan</h2>

        <div className="mt-3 space-y-2">
          <h3 className="text-sm font-medium">Ukuran font</h3>
          <div className="flex gap-2">
            {FONT_SIZES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => update({ fontSize: value })}
                aria-pressed={settings.fontSize === value}
                className={cn(
                  'flex-1 rounded-lg border px-4 py-2.5 text-sm transition-colors',
                  settings.fontSize === value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-background p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <Info className="size-4.5 text-primary" aria-hidden="true" />
          Tentang CuraBot
        </h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Pembuat</dt>
            <dd className="font-medium">Ahmad Faqih Ar Rifa'i</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Repositori</dt>
            <dd>
              <Button variant="outline" size="sm" asChild>
                <a href="https://github.com/LAWAGGG/CuraBot" target="_blank" rel="noreferrer">
                  <ExternalLink aria-hidden="true" />
                  GitHub
                </a>
              </Button>
            </dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
