import { useEffect, useRef, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Ellipsis,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  ShoppingBag,
  Trash2,
  User as UserIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import ConfirmDialog from '@/components/ConfirmDialog'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Input } from '@/components/ui/input'
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

const isManualOrder = (order) =>
  !order?.customer_user_id || String(order.customer_user_id).startsWith('manual-')

function productSummary(products = []) {
  if (products.length === 0) return '—'
  return products
    .map((product) => `${product.product_name} ×${product.quantity ?? 1}`)
    .join(', ')
}

function OrderDetail({ order, onClose, onChat }) {
  const manual = isManualOrder(order)
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

            <section className="rounded-xl border border-border bg-muted/30 p-3">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Pengguna
              </h3>
              <div className="mt-2 flex items-center gap-3">
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary"
                  aria-hidden="true"
                >
                  {(String(order.customer_name || order.customer_user_id || 'U').trim().charAt(0) || 'U').toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {order.customer_name || `User ${String(order.customer_user_id ?? '').slice(-6)}`}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    ID: {order.customer_user_id || '—'}
                  </p>
                  {order.customer_phone ? (
                    <p className="truncate text-xs text-muted-foreground">{order.customer_phone}</p>
                  ) : null}
                </div>
              </div>
              {manual ? (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <UserIcon className="size-3.5" aria-hidden="true" />
                  Pesanan manual — tidak terhubung ke chat.
                </p>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => onChat?.(order)}
                >
                  <MessageCircle aria-hidden="true" />
                  Lihat Chat Pengguna
                </Button>
              )}
            </section>

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

const emptyProduct = () => ({ product_name: '', quantity: 1, price: 0, note: '' })

function OrderForm({ open, order, botId, onClose, onSaved }) {
  const editing = Boolean(order)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [status, setStatus] = useState('pending')
  const [products, setProducts] = useState([emptyProduct()])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(order?.customer_name || '')
    setPhone(order?.customer_phone || '')
    setAddress(order?.delivery_address || '')
    setStatus(order?.status || 'pending')
    setProducts(
      order?.products?.length
        ? order.products.map((p) => ({
            product_name: p.product_name || '',
            quantity: p.quantity ?? 1,
            price: p.price ?? 0,
            note: p.note || '',
          }))
        : [emptyProduct()],
    )
  }, [open, order])

  const total = products.reduce(
    (sum, p) => sum + (Number(p.price) || 0) * (Number(p.quantity) || 0),
    0,
  )

  const setProduct = (index, patch) =>
    setProducts((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)))

  const submit = async () => {
    const cleanProducts = products
      .map((p) => ({
        product_name: String(p.product_name || '').trim(),
        quantity: Math.max(1, Number(p.quantity) || 1),
        price: Math.max(0, Number(p.price) || 0),
        note: String(p.note || '').trim() || null,
      }))
      .filter((p) => p.product_name)
    if (!name.trim()) {
      toast.error('Isi nama pelanggan terlebih dahulu.')
      return
    }
    if (cleanProducts.length === 0) {
      toast.error('Tambahkan minimal 1 produk dengan nama.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        customer_name: name.trim(),
        customer_phone: phone.trim() || null,
        delivery_address: address.trim() || null,
        products: cleanProducts,
        total_price: total,
        status,
      }
      if (editing) {
        await apiFetch(null, {
          method: 'put',
          url: `/api/bots/${botId}/orders/${order.id}`,
          data: payload,
        })
        toast.success('Pesanan diperbarui.')
      } else {
        await apiFetch(null, { method: 'post', url: `/api/bots/${botId}/orders`, data: payload })
        toast.success('Pesanan manual ditambahkan.')
      }
      invalidate(`orders:${botId}`)
      onSaved?.()
      onClose?.()
    } catch (caught) {
      toast.error(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!next && !saving ? onClose?.() : null)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? `Ubah pesanan #${order?.id}` : 'Tambah pesanan manual'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Sesuaikan data pesanan sesuai kebutuhan pelanggan.'
              : 'Buat pesanan baru secara manual untuk pelanggan.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="order-name">Nama pelanggan</Label>
              <Input
                id="order-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama pelanggan"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="order-phone">No. HP</Label>
              <Input
                id="order-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08..."
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="order-address">Alamat pengiriman</Label>
            <Textarea
              id="order-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Alamat lengkap / Onsite"
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger aria-label="Status pesanan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Produk</Label>
              <Button variant="outline" size="sm" onClick={() => setProducts((p) => [...p, emptyProduct()])}>
                <Plus aria-hidden="true" />
                Tambah
              </Button>
            </div>
            {products.map((p, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-border p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    value={p.product_name}
                    onChange={(e) => setProduct(i, { product_name: e.target.value })}
                    placeholder="Nama produk"
                    aria-label={`Nama produk ${i + 1}`}
                  />
                  <Input
                    value={p.note}
                    onChange={(e) => setProduct(i, { note: e.target.value })}
                    placeholder="Catatan (opsional)"
                    aria-label={`Catatan produk ${i + 1}`}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      min={1}
                      value={p.quantity}
                      onChange={(e) => setProduct(i, { quantity: e.target.value })}
                      aria-label={`Jumlah produk ${i + 1}`}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Harga</Label>
                    <Input
                      type="number"
                      min={0}
                      value={p.price}
                      onChange={(e) => setProduct(i, { price: e.target.value })}
                      aria-label={`Harga produk ${i + 1}`}
                    />
                  </div>
                </div>
                {products.length > 1 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setProducts((prev) => prev.filter((_, j) => j !== i))}
                  >
                    <Trash2 aria-hidden="true" />
                    Hapus produk
                  </Button>
                ) : null}
              </div>
            ))}
            <p className="text-right text-sm">
              Total: <span className="font-bold text-primary">{formatRupiah(total)}</span>
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button onClick={submit} disabled={saving}>
            {editing ? 'Simpan perubahan' : 'Tambah pesanan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function BotOrders() {
  const { bot, setSelectedChat } = useOutletContext()
  const navigate = useNavigate()
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState(null)
  const [rejecting, setRejecting] = useState(null)
  const [reason, setReason] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [warning, setWarning] = useState(null)
  const [formState, setFormState] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const ordersKey = `orders:${bot.id}:${status}:${page}`
  const { data, loading, error, refresh } = useApi(ordersKey, () =>
    apiFetch(ordersKey, {
      url: `/api/bots/${bot.id}/orders`,
      params: { page, limit: PAGE_SIZE, ...(status !== 'all' ? { status } : {}) },
    }),
  )
  const orders = data?.orders ?? []
  // ponytail: klik opsi Select/DropdownMenu yang unmount bisa "jatuh" ke row di bawahnya -> tahan klik row sejenak
  const suppressRowClick = useRef(0)
  const guardRowClick = (order) => {
    if (Date.now() - suppressRowClick.current < 300) return
    setDetail(order)
  }
  const markOverlayClose = () => { suppressRowClick.current = Date.now() }
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const goToChat = (order) => {
    if (isManualOrder(order)) return
    const user = { user_id: order.customer_user_id, customer_name: order.customer_name }
    setDetail(null)
    navigate(`/bots/${bot.id}/percakapan`)
    // ponytail: BotLayout mereset selectedChat saat pathname berubah -> set setelah navigasi
    setTimeout(() => setSelectedChat?.(user), 50)
  }

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

  const confirmDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await apiFetch(null, { method: 'delete', url: `/api/bots/${bot.id}/orders/${deleting.id}` })
      invalidate(`orders:${bot.id}`)
      invalidate(`analytics:${bot.id}`)
      if (detail?.id === deleting.id) setDetail(null)
      setDeleting(null)
      await refresh()
      toast.success('Pesanan dihapus.')
    } catch (caught) {
      toast.error(errorMessage(caught))
    } finally {
      setDeleteBusy(false)
    }
  }

  const exportOrders = async () => {
    try {
      const slug =
        (bot.name || '')
          .normalize('NFKD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || 'toko'
      const now = new Date()
      const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      await downloadFile(`/api/bots/${bot.id}/orders/export`, `${slug}-orders-${stamp}.xlsx`)
      toast.success('Berkas Excel pesanan diunduh.')
    } catch (caught) {
      toast.error(errorMessage(caught))
    }
  }

  const statusMenu = (order) => (
    <>
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
    </>
  )

  const manageMenu = (order) => (
    <>
      <DropdownMenuLabel>Kelola pesanan</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => setFormState({ mode: 'edit', order })}>
        <Pencil aria-hidden="true" />
        Ubah pesanan
      </DropdownMenuItem>
      {!isManualOrder(order) ? (
        <DropdownMenuItem onSelect={() => goToChat(order)}>
          <MessageCircle aria-hidden="true" />
          Lihat chat pengguna
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(order)}>
        <Trash2 aria-hidden="true" />
        Hapus pesanan
      </DropdownMenuItem>
    </>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Select
            value={status}
            onValueChange={(value) => {
              markOverlayClose()
              setStatus(value)
              setPage(1)
            }}
            onOpenChange={(open) => { if (!open) markOverlayClose() }}
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
        <div className="flex items-center gap-2">
          <Button onClick={() => setFormState({ mode: 'add', order: null })}>
            <Plus aria-hidden="true" />
            Tambah Pesanan
          </Button>
          <Button variant="outline" onClick={exportOrders}>
            <Download aria-hidden="true" />
            Ekspor Excel
          </Button>
        </div>
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
          description="Pesanan yang dikonfirmasi pelanggan di Telegram akan muncul di sini. Anda juga bisa menambah pesanan manual."
          action={
            <Button onClick={() => setFormState({ mode: 'add', order: null })}>
              <Plus aria-hidden="true" />
              Tambah Pesanan
            </Button>
          }
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
                  <TableHead className="w-12 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order, index) => (
                  <TableRow key={order.id} className="rise cursor-pointer" style={{ animationDelay: `${index * 50}ms` }} onClick={() => guardRowClick(order)}>
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
                      <DropdownMenu onOpenChange={(open) => { if (!open) markOverlayClose() }}>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            disabled={busyId === order.id}
                            aria-label={`Ubah status pesanan ${order.id}`}
                            title="Ubah status"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 rounded-full outline-none transition hover:opacity-75 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                          >
                            <StatusBadge status={order.status} />
                            <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                          {statusMenu(order)}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(order.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <DropdownMenu onOpenChange={(open) => { if (!open) markOverlayClose() }}>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Kelola pesanan ${order.id}`}
                              title="Kelola pesanan"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Ellipsis aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            {manageMenu(order)}
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
              <li key={order.id} style={{ animationDelay: `${index * 60}ms` }} className="rise cursor-pointer rounded-xl border border-border bg-background p-4" onClick={() => guardRowClick(order)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{order.customer_name || 'Pelanggan'}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                      {productSummary(order.products)}
                    </p>
                  </div>
                  <DropdownMenu onOpenChange={(open) => { if (!open) markOverlayClose() }}>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        disabled={busyId === order.id}
                        aria-label={`Ubah status pesanan ${order.id}`}
                        title="Ubah status"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full outline-none transition hover:opacity-75 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                      >
                        <StatusBadge status={order.status} />
                        <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      {statusMenu(order)}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <div>
                    <p className="font-bold text-primary">{formatRupiah(order.total_price)}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(order.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <DropdownMenu onOpenChange={(open) => { if (!open) markOverlayClose() }}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label={`Kelola pesanan ${order.id}`}
                          title="Kelola pesanan"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Ellipsis aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        {manageMenu(order)}
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

      <OrderDetail order={detail} onClose={() => setDetail(null)} onChat={goToChat} />

      <OrderForm
        open={Boolean(formState)}
        order={formState?.order}
        botId={bot.id}
        onClose={() => setFormState(null)}
        onSaved={() => {
          refresh()
          setDetail(null)
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(next) => (!deleteBusy && !next ? setDeleting(null) : null)}
        title={`Hapus pesanan #${deleting?.id}?`}
        description="Pesanan dihapus permanen dan tidak bisa dikembalikan."
        confirmLabel="Hapus"
        loading={deleteBusy}
        onConfirm={confirmDelete}
      />

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
