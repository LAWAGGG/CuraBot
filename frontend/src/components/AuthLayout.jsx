import { MessageSquareText, QrCode, Sparkles } from 'lucide-react'

import CuraBotLogo from '@/components/CuraBotLogo'

const FEATURES = [
  {
    icon: MessageSquareText,
    title: 'Balas pelanggan otomatis',
    text: 'Bot menjawab pertanyaan dan mencatat pesanan kapan pun.',
  },
  {
    icon: Sparkles,
    title: 'Dibuat tanpa coding',
    text: 'Jawab beberapa pertanyaan, bot Anda langsung siap.',
  },
  {
    icon: QrCode,
    title: 'Bagikan lewat tautan & QR',
    text: 'Pelanggan terhubung dalam sekali ketuk di Telegram.',
  },
]

export default function AuthLayout({ children }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1.05fr_1fr]">
      <aside className="mesh hidden flex-col justify-between p-10 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <CuraBotLogo className="size-10" />
          <span className="text-xl font-bold tracking-tight">CuraBot</span>
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl leading-snug font-bold">
            Bot layanan pelanggan untuk usaha Anda, siap dalam 5 menit.
          </h2>
          <ul className="mt-8 space-y-5">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex gap-3.5">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <feature.icon className="size-4.5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold">{feature.title}</p>
                  <p className="text-sm text-white/80">{feature.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-white/60">CuraBot — platform bot Telegram untuk UMKM.</p>
      </aside>
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <CuraBotLogo className="size-9" />
            <span className="text-lg font-bold tracking-tight">CuraBot</span>
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}
