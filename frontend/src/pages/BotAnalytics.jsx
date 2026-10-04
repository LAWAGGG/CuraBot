import { lazy, Suspense, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  BarChart3,
  Clock,
  MessageSquareText,
  RefreshCw,
  ShoppingBag,
  Target,
  Users,
} from 'lucide-react'

import StatCard from '@/components/StatCard'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { apiFetch } from '@/lib/api'
import { useApi } from '@/hooks/useApi'

const AnalyticsCharts = lazy(() => import('@/components/AnalyticsCharts'))

const RANGES = [
  { value: '7', label: '7 hari terakhir' },
  { value: '30', label: '30 hari terakhir' },
  { value: '90', label: '90 hari terakhir' },
  { value: '365', label: '1 tahun terakhir' },
]

export default function BotAnalytics() {
  const { bot } = useOutletContext()
  const [range, setRange] = useState('7')

  const analyticsKey = `analytics:${bot.id}:${range}`
  const { data, loading, error, refresh } = useApi(analyticsKey, () =>
    apiFetch(analyticsKey, {
      url: `/api/bots/${bot.id}/analytics`,
      params: { range: Number(range) },
    }),
  )

  const hasChartData =
    (data?.conversations_per_day?.length ?? 0) > 0 || (data?.orders_per_day?.length ?? 0) > 0

  const metrics = data
    ? [
        {
          label: 'Total Percakapan',
          value: data.total_conversations,
          icon: MessageSquareText,
          accent: 'primary',
          hint: 'Pesan pelanggan pada periode ini',
        },
        {
          label: 'Pengguna Unik',
          value: data.unique_users,
          icon: Users,
          accent: 'info',
          hint: 'Jumlah pelanggan berbeda',
        },
        {
          label: 'Rata-rata Respons',
          value: `${data.avg_response_time} dtk`,
          icon: Clock,
          accent: 'warning',
          hint: 'Kecepatan balasan bot',
        },
        {
          label: 'Total Pesanan',
          value: data.total_orders,
          icon: ShoppingBag,
          accent: 'primary',
          hint: 'Termasuk yang belum lengkap',
        },
        {
          label: 'Pesanan Terekstrak',
          value: data.orders_extracted,
          icon: Target,
          accent: 'success',
          hint: 'Pesanan dengan data lengkap',
        },
        {
          label: 'Keberhasilan Model',
          value: `${data.model_success_rate}%`,
          icon: BarChart3,
          accent: 'success',
          hint: 'Balasan berhasil diproses AI',
        },
      ]
    : []

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-48" aria-label="Pilih rentang waktu">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => refresh()} disabled={loading}>
          <RefreshCw className={loading ? 'animate-spin' : undefined} aria-hidden="true" />
          Segarkan
        </Button>
      </div>

      {loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
          <Button variant="outline" size="sm" onClick={() => refresh()}>
            Coba Lagi
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {metrics.map((metric) => (
              <StatCard key={metric.label} {...metric} />
            ))}
          </div>

          {hasChartData ? (
            <Suspense
              fallback={
                <div className="grid gap-5 lg:grid-cols-2">
                  <Skeleton className="h-80 rounded-xl" />
                  <Skeleton className="h-80 rounded-xl" />
                </div>
              }
            >
              <AnalyticsCharts
                conversationsPerDay={data.conversations_per_day}
                ordersPerDay={data.orders_per_day}
              />
            </Suspense>
          ) : (
            <p className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground">
              Belum ada aktivitas pada periode ini. Grafik akan muncul setelah bot mulai dipakai.
            </p>
          )}
        </>
      )}
    </div>
  )
}
