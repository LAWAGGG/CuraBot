import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  MapPin,
  Phone,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react'
import { toast } from 'sonner'

import EmptyState from '@/components/EmptyState'
import StatusBadge from '@/components/StatusBadge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { apiFetch, downloadFile, errorMessage, invalidate } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { formatDateTime, formatRupiah } from '@/lib/utils'

const PAGE_SIZE = 20

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Menunggu' },
  { value: 'incomplete', label: 'Belum lengkap' },
  { value: 'confirmed', label: 'Dikonfirmasi' },
  { value: 'shipped', label: 'Dikirim' },
  { value: 'completed', label: 'Selesai' },
  { value: 'rejected', label: 'Ditolak' },
]

const NEEDS_PROOF_STATUS = ['confirmed', 'shipped', 'completed']

function productSummary(products = []) {
  if (products.length === 0) return '—'
  return products
    .map((product) => `${product.product_name} ×${product.quantity ?? 1}`)
    .join(', ')
}

function OrderDetail({ order, onClose }) {
  return (
    <Drawer open={Boolean(order)} onOpenChange={(open) => (!open ? onClose() : null)} direction="right">
      <DrawerContent className="w-full sm:max-w-md">
        <DrawerHeader className="border-b border-border">
          <DrawerTitle>Pesanan #{order?.id}</DrawerTitle>
          <DrawerDescription>
            {order?.customer_name || 'Pelanggan'} · {formatDateTime(order?.created_at)}
          </DrawerDescription>
        </DrawerHeader>
        {order ? (
          <div className="space-y-5 overflow-y-auto p-4">
            <div className="flex items-center gap-2">
              <StatusBadge status={order.status} />
              {order.rejection_reason ? (
                <span className="text-xs text-destructive">Alasan: {order.rejection_reason}</span>
              ) : null}
            </div>

            <section>
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Produk
              </h3>
              <ul className="mt-2 space-y-2">
                {(order.products ?? []).map((product, index) => (
                  <li
                    key={`${product.product_name}-${index}`}
                    className="rounded-lg border border-border bg-muted/30 px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">{product.product_name}</span>
                      <span className="text-sm text-muted-foreground">
                        {product.quantity ?? 1} × {formatRupiah(product.price ?? 0)}
                      </span>
                    </div>
                    {product.note ? (
                      <p className="mt-1 text-xs text-muted-foreground">Catatan: {product.note}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
                <span className="font-medium">Total</span>
                <span className="font-bold text-primary">{formatRupiah(order.total_price)}</span>
              </div>
            </section>

            <section className="space-y-2 text-sm">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Pengiriman
              </h3>
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                {order.delivery_address || 'Belum diisi'}
              </p>
              <p className="flex items-start gap-2">
                <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                {order.customer_phone || 'Belum diisi'}
              </p>
            </section>

            {order.payment_proof_url ? (
              <section>
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Bukti pembayaran
                </h3>
                <a href={order.payment_proof_url} target="_blank" rel="noreferrer">
                  <img
                    src={order.payment_proof_url}
                    alt="Bukti pembayaran pelanggan"
                    className="mt-2 max-h-80 w-full rounded-lg border border-border object-contain"
                  />
                </a>
              </section>
            ) : null}
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}

export default function BotOrders() {
  const { bot } = useOutletContext()
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState(null)
  const [rejecting, setRejecting] = useState(null)
  const [reason, setReason] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [warning, setWarning] = useState(null)

  const ordersKey = `orders:${bot.id}:${status}:${page}`
  const { data, loading, error, refresh } = useApi(ordersKey, () =>
    apiFetch(ordersKey, {
      url: `/api/bots/${bot.id}/orders`,
      params: { page, limit: PAGE_SIZE, ...(status !== 'all' ? { status } : {}) },
    }),
  )
  const orders = data?.orders ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const applyStatus = async (order, nextStatus, rejectionReason) => {
    setBusyId(order.id)
    try {
      await apiFetch(null, {
        method: 'put',
        url: `/api/bots/${bot.id}/orders/${order.id}`,
        data: { status: nextStatus, ...(rejectionReason ? { reason: rejectionReason } : {}) },
      })
      invalidate(`orders:${bot.id}`)
      invalidate(`analytics:${bot.id}`)
      await refresh()
      toast.success('Status pesanan diperbarui. Pelanggan diberi tahu lewat Telegram.')
    } catch (caught) {
      toast.error(errorMessage(caught))
    } finally {
      setBusyId(null)
    }
  }

  const handleStatusSelect = (order, nextStatus) => {
    if (nextStatus === 'rejected') {
      setRejecting(order)
      setReason('')
      return
    }
    if (order.status === 'incomplete' && NEEDS_PROOF_STATUS.includes(nextStatus) && !order.payment_proof_url) {
      setWarning({ order, nextStatus })
      return
    }
    applyStatus(order, nextStatus)
  }

  const sendWarningOnly = async () => {
    if (!warning) return
    const { order } = warning
    setBusyId(order.id)
    try {
      await apiFetch(null, {
        method: 'post',
        url: `/api/bots/${bot.id}/orders/${order.id}/remind`,
      })
      toast.success('Peringatan pembayaran dikirim ke customer via Telegram.')
      setWarning(null)
    } catch (caught) {
      toast.error(errorMessage(caught))
    } finally {
      setBusyId(null)
    }
  }

  const confirmReject = async () => {
    if (!rejecting) return
    if (!reason.trim()) {
      toast.error('Tulis alasan penolakan terlebih dahulu.')
      return
    }
    await applyStatus(rejecting, 'rejected', reason.trim())
    setRejecting(null)
    setReason('')
  }

  const exportOrders = async () => {
    try {
      await downloadFile(`/api/bots/${bot.id}/orders/export`, 'orders.xlsx')
      toast.success('Berkas Excel pesanan diunduh.')
    } catch (caught) {
      toast.error(errorMessage(caught))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-44" aria-label="Saring status pesanan">
              <SelectValue placeholder="Semua status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua status</SelectItem>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{total} pesanan</span>
        </div>
        <Button variant="outline" onClick={exportOrders}>
          <Download aria-hidden="true" />
          Ekspor Excel
        </Button>
      </div>

      {loading && !data ? (
        <div className="space-y-2">
          <Skeleton className="h-14 rounded-lg" />
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
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Belum ada pesanan"
          description="Pesanan yang dikonfirmasi pelanggan di Telegram akan muncul di sini beserta statusnya."
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-border bg-background md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Waktu</TableHead>
                  <TableHead className="w-24 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order, index) => (
                  <TableRow key={order.id} className="rise" style={{ animationDelay: `${index * 50}ms` }}>
                    <TableCell>
                      <p className="font-medium">{order.customer_name || 'Pelanggan'}</p>
                      <p className="text-xs text-muted-foreground">{order.customer_phone || '—'}</p>
                    </TableCell>
                    <TableCell className="max-w-72">
                      <p className="truncate" title={productSummary(order.products)}>
                        {productSummary(order.products)}
                      </p>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatRupiah(order.total_price)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(order.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDetail(order)}
                          aria-label={`Lihat detail pesanan ${order.id}`}
                        >
                          <Eye aria-hidden="true" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={busyId === order.id}
                              aria-label={`Ubah status pesanan ${order.id}`}
                            >
                              <ChevronDown aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ubah status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {STATUS_OPTIONS.map((option) => (
                              <DropdownMenuItem
                                key={option.value}
                                disabled={option.value === order.status}
                                onSelect={() => handleStatusSelect(order, option.value)}
                                variant={option.value === 'rejected' ? 'destructive' : undefined}
                              >
                                {option.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="space-y-3 md:hidden">
            {orders.map((order, index) => (
              <li key={order.id} style={{ animationDelay: `${index * 60}ms` }} className="rise rounded-xl border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{order.customer_name || 'Pelanggan'}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                      {productSummary(order.products)}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <div>
                    <p className="font-bold text-primary">{formatRupiah(order.total_price)}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(order.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => setDetail(order)}>
                      <Eye aria-hidden="true" />
                      Detail
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          disabled={busyId === order.id}
                          aria-label={`Ubah status pesanan ${order.id}`}
                        >
                          <ChevronDown aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ubah status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {STATUS_OPTIONS.map((option) => (
                          <DropdownMenuItem
                            key={option.value}
                            disabled={option.value === order.status}
                            onSelect={() => handleStatusSelect(order, option.value)}
                            variant={option.value === 'rejected' ? 'destructive' : undefined}
                          >
                            {option.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              <ChevronLeft aria-hidden="true" />
              Sebelumnya
            </Button>
            <span className="text-sm text-muted-foreground">
              Halaman {page} dari {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            >
              Berikutnya
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </>
      )}

      <OrderDetail order={detail} onClose={() => setDetail(null)} />

      <AlertDialog open={Boolean(warning)} onOpenChange={(open) => (!open ? setWarning(null) : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pesanan #{warning?.order.id} belum ada bukti bayar</AlertDialogTitle>
            <AlertDialogDescription>
              {warning?.order.customer_name || 'Pelanggan'} · {productSummary(warning?.order.products)} ·{' '}
              {formatRupiah(warning?.order.total_price)}. Status tidak diubah. Pilih kirim peringatan ke
              customer, lewati untuk tetap menaikkan ke {warning?.nextStatus}, atau batal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(busyId)}>Batal</AlertDialogCancel>
            <Button
              variant="ghost"
              onClick={() => {
                const current = warning
                setWarning(null)
                applyStatus(current.order, current.nextStatus)
              }}
              disabled={Boolean(busyId)}
            >
              Lewati
            </Button>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                sendWarningOnly()
              }}
              disabled={Boolean(busyId)}
            >
              Kirim peringatan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(rejecting)} onOpenChange={(open) => (!open ? setRejecting(null) : null)}>
        <AlertDialogContent className="top-auto bottom-0 w-full translate-x-[-50%] translate-y-0 rounded-t-2xl rounded-b-none data-[size=default]:max-w-none sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 sm:rounded-xl data-[size=default]:sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Tolak pesanan #{rejecting?.id}</AlertDialogTitle>
            <AlertDialogDescription>
              Pelanggan akan menerima alasan penolakan ini lewat Telegram.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Alasan penolakan</Label>
            <Textarea
              id="reject-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Contoh: Stok habis, silakan pesan menu lain."
            />
          </div>
          <AlertDialogFooter className="flex-row justify-end">
            <AlertDialogCancel onClick={() => setRejecting(null)} disabled={Boolean(busyId)}>
              Batal
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={Boolean(busyId)}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Tolak Pesanan
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
