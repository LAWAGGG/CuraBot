import { Check, QrCode, Send } from 'lucide-react'

import Mascot from '@/components/Mascot'

/**
 * Pratinjau percakapan bot: satu-satunya bagian halaman yang kaya warna.
 * Urutan pesan berjalan sendiri, mengikuti alur nyata: pelanggan bertanya,
 * bot mengetik, bot menjawab, pesanan tercatat.
 */
export default function AuthPreview({ className = '' }) {
  return (
    <div
      className={`w-full overflow-hidden rounded-2xl border border-[#0E2B26]/8 bg-white shadow-[0_24px_60px_-30px_rgba(11,60,52,0.45)] dark:border-white/10 dark:bg-[#16201B] dark:shadow-none ${className}`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="relative">
          <Mascot className="size-9" />
          <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-[#10B981] ring-2 ring-white dark:ring-[#16201B]" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-[#14231F] dark:text-foreground">
            CuraBot Toko
          </span>
          <span className="block text-xs text-[#5F7772] dark:text-muted-foreground">online</span>
        </span>
        <span className="ml-auto flex size-8 items-center justify-center rounded-lg border border-[#0E2B26]/10 text-[#4B6B63] dark:border-white/10 dark:text-muted-foreground">
          <QrCode className="size-4" strokeWidth={1.5} aria-hidden="true" />
        </span>
      </div>

      <div className="h-px bg-[#0E2B26]/8 dark:bg-white/10" />

      <div className="space-y-3 bg-[#F1F6F4] px-4 py-4 dark:bg-[#121A15]">
        <p className="chat-step chat-step-1 max-w-[85%] rounded-2xl rounded-bl-md border border-[#0E2B26]/8 bg-white px-3 py-2 text-[13px] leading-5 text-[#14231F] dark:border-white/10 dark:bg-[#1B2620] dark:text-foreground">
          Halo kak, masih ada stok jersey ukuran L warna hijau?
        </p>

        <div className="grid">
          <p className="chat-step chat-step-3 col-start-1 row-start-1 ml-auto max-w-[85%] self-start rounded-2xl rounded-br-md bg-[#0B7A69] px-3 py-2 text-[13px] leading-5 text-white dark:bg-[#14B89C] dark:text-[#06251F]">
            Halo Kak Sari, stok warna hijau ukuran L tinggal 4 pcs. Mau saya catat pesanannya?
          </p>
          <div className="chat-step chat-step-2 col-start-1 row-start-1 ml-auto flex w-fit items-center gap-1 self-end rounded-2xl rounded-br-md bg-[#E3EDE9] px-3 py-2.5 dark:bg-[#22302A]">
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className="typing-dot size-1.5 rounded-full bg-[#7C8E88] dark:bg-[#9AAFA5]"
                style={{ animationDelay: `${index * 0.15}s` }}
              />
            ))}
            <span className="sr-only">Bot sedang membalas</span>
          </div>
        </div>

        <div className="chat-step chat-step-4 rounded-xl border border-[#0E2B26]/8 bg-white p-3 dark:border-white/10 dark:bg-[#1B2620]">
          <div className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-md bg-[#DFF0EA] dark:bg-[#14352C]">
              <Check
                className="size-3.5 text-[#0B7A69] dark:text-[#7FE0BF]"
                strokeWidth={2.5}
                aria-hidden="true"
              />
            </span>
            <span className="text-[13px] font-medium text-[#14231F] dark:text-foreground">
              Pesanan #B-2417
            </span>
            <span className="ml-auto text-[11px] tabular-nums text-[#5F7772] dark:text-muted-foreground">
              10:42
            </span>
          </div>
          <p className="mt-1.5 pl-7 text-[13px] text-[#44544F] dark:text-muted-foreground">
            Jersey hijau ukuran L ×2
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-[#0E2B26]/8 px-3 py-3 dark:border-white/10">
        <span className="flex-1 truncate rounded-lg bg-[#EFF4F2] px-3 py-2 text-[13px] text-[#7C8E88] dark:bg-[#16201B] dark:text-muted-foreground">
          Balas pelanggan
        </span>
        <span className="flex size-8 items-center justify-center rounded-lg bg-[#0B7A69] text-white dark:bg-[#14B89C] dark:text-[#06251F]">
          <Send className="size-4" strokeWidth={1.5} aria-hidden="true" />
        </span>
      </div>
    </div>
  )
}
