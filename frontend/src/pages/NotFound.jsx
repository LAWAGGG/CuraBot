import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="text-6xl font-black text-primary/20" aria-hidden="true">
        404
      </span>
      <h1 className="text-2xl font-bold tracking-tight">Halaman tidak ditemukan</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Tautan yang Anda buka mungkin salah atau sudah dipindahkan.
      </p>
      <Button asChild className="mt-2">
        <Link to="/">Kembali ke Beranda</Link>
      </Button>
    </div>
  )
}
