# Spec Desain Frontend CuraBot

**Tanggal:** 2026-10-04
**Status:** Disetujui untuk perencanaan implementasi
**Acuan:** `rules/PRD.md`, `rules/DESIGN.md`, kode backend `backend/src/app/`

---

## 1. Ringkasan

Membangun seluruh antarmuka frontend CuraBot: aplikasi web untuk pemilik usaha
membuat, mengonfigurasi, membagikan, dan memantau bot layanan pelanggan berbasis
Telegram. Fokus utama: **wizard pembuatan bot langkah demi langkah** yang
menghasilkan system prompt sesuai keinginan pengguna, disusul halaman pengelolaan
(berkas, pesanan, percakapan, analitik, pengaturan).

Seluruh bahasa antarmuka, dokumen, dan kode pesan memakai **Bahasa Indonesia**.

---

## 2. Ruang Lingkup

**Termasuk (seluruh aplikasi):**

1. Masuk & Daftar (autentikasi JWT)
2. Beranda: daftar bot pengguna
3. Wizard pembuatan bot 7 langkah + tinjauan
4. Halaman bot dengan 6 tab: Ringkasan, Percakapan, Pesanan, Berkas, Analitik, Pengaturan
5. Efisiensi pemanggilan API (cache, dedup, abort, tanpa polling)
6. Status pemuatan/galat/kosong + aksesibilitas WCAG AA

**Tidak termasuk (di luar cakupan):**

- Mode gelap (PRD menyebut sebagai "future")
- Endpoint pencarian percakapan (backend tidak menyediakannya)
- Integrasi kode QR di backend (dibuat di sisi klien)
- Token Telegram per bot (backend memakai satu bot platform + tautan `?start=bot_{id}`)
- Pengujian otomatis end-to-end (verifikasi lewat lint, build, dan uji manual)

---

## 3. Kondisi Backend (Aktual)

Backend sudah terverifikasi. Frontend **wajib mengikuti kontrak aktual**, bukan
PRD bila berbeda.

### 3.1 Deviasi PRD → Aktual

| PRD | Aktual |
|-----|--------|
| Pengguna memberi `telegram_token` per bot | Tidak ada; satu token platform, tautan `https://t.me/{TELEGRAM_BOT_USERNAME}?start=bot_{id}` |
| `POST /api/bots/create` tanpa `payment_info` | `payment_info` opsional; ada endpoint QRIS `POST /api/bots/{bot_id}/qris` |
| Status order: pending/confirmed/shipped/completed | Tambah `incomplete` dan `rejected` (+ `reason`) |
| Dukungan file PDF/DOCX | Juga `.xlsx`; maks 10 berkas/bot, 25MB/berkas |
| QR code dari `qrcode.react` | Belum terpasang; akan ditambahkan (1 dependensi) |

### 3.2 Daftar Endpoint

| Metode | Jalur | Keterangan |
|--------|-------|------------|
| POST | `/api/auth/register` | `{email, password≥8}` → 201 `{id, email}`; 409 email terdaftar |
| POST | `/api/auth/login` | → `{access_token, token_type, expires_in}`; 401 salah kredensial |
| POST | `/api/auth/logout` | Perlu token; `{ok}` |
| POST | `/api/bots/create` | `{name, system_prompt≥10, api_key≥10, payment_info?}` → objek bot |
| GET | `/api/bots/list` | → `{bots: [...]}` urut terbaru |
| GET | `/api/bots/{id}` | → objek bot; 404 bila bukan milik pengguna |
| PUT | `/api/bots/{id}` | Field opsional: `name, system_prompt, api_key, payment_info` |
| DELETE | `/api/bots/{id}` | Nonaktifkan bot (soft delete) |
| POST | `/api/files/upload` | Multipart `bot_id`, `file`; `.pdf/.docx/.doc/.xlsx` |
| POST | `/api/bots/{id}/qris` | Multipart `file` JPG/PNG |
| GET | `/api/files/{bot_id}` | → `{files: [...]}` |
| DELETE | `/api/files/{file_id}` | Hapus berkas + disk |
| GET | `/api/messages/{bot_id}?page&limit` | `limit ≤ 100`; → `{page, limit, total, messages}` |
| GET | `/api/bots/{id}/orders?page&limit&status` | → `{page, limit, total, orders}` |
| PUT | `/api/bots/{id}/orders/{order_id}` | `{status, reason?}`; `reason` wajib saat `rejected` |
| GET | `/api/bots/{id}/orders/export` | Berkas `orders.xlsx`; 404 bila belum ada |
| GET | `/api/bots/{id}/analytics?range=1..365` | Banyak metrik + `conversations_per_day`, `orders_per_day` |

### 3.3 Bentuk Data Penting

**Objek bot (`public_bot`):**
```json
{
  "id": 1, "name": "Toko A", "system_prompt": "...",
  "telegram_bot_name": "...", "telegram_link": "https://t.me/...?start=bot_1",
  "payment_info": "...", "qris_image_url": "http://.../qris_....png",
  "status": "active", "created_at": "2026-..."
}
```

**Order:**
```json
{
  "id": 1, "bot_id": 1, "message_id": 2, "customer_user_id": "...",
  "customer_name": "...", "products": [{"product_name": "...", "quantity": 1, "price": 10000, "note": "..."}],
  "total_price": 10000, "delivery_address": "...", "customer_phone": "...",
  "status": "pending", "rejection_reason": null,
  "payment_proof_url": "http://.../proof_....jpg",
  "created_at": "...", "updated_at": "..."
}
```

**Analitik:**
```json
{
  "total_conversations": 0, "unique_users": 0, "avg_response_time": 0,
  "total_orders": 0, "orders_extracted": 0, "model_success_rate": 0,
  "conversations_per_day": [{"date": "2026-10-01", "count": 3}],
  "orders_per_day": [{"date": "2026-10-01", "count": 1}]
}
```

Catatan label model: `flash-3.6` (utama), `flash-3.5-lite` (cadangan), `none` (galat).

---

## 4. Arsitektur & Struktur Berkas

### 4.1 Teknologi

| Lapisan | Teknologi |
|---------|-----------|
| Kerangka | React 19 + Vite 8 |
| Gaya | Tailwind CSS 4 via `@tailwindcss/vite` (belum di-wire di `vite.config.js`) |
| Komponen | shadcn/ui mode JavaScript (`tsx: false`), primitif Radix, ikon lucide-react |
| Grafik | recharts via komponen chart shadcn |
| Notifikasi | sonner |
| Kode QR | qrcode.react |
| Perutean | react-router-dom 7 |
| HTTP | axios |
| Lint | oxlint |

### 4.2 Perubahan Konfigurasi Awal

1. `vite.config.js`: tambahkan plugin `@tailwindcss/vite` + alias `@` → `src`.
2. `jsconfig.json`: `paths` `@/*` → `src/*`.
3. `components.json`: konfigurasi shadcn, `tsx: false`, alias `@/components`, `@/lib/utils`.
4. `index.html`: `lang="id"`, judul "CuraBot".
5. `src/index.css`: impor Tailwind, font Inter, variabel tema Green Beach.

### 4.3 Struktur Berkas

```
src/
  lib/
    api.js         # instance axios, cache, dedup, abort, helper unduh blob
    auth.jsx       # AuthProvider, useAuth, penyimpanan token, RequireAuth
    prompt.js      # generator system prompt dari jawaban wizard (fungsi murni)
    utils.js       # cn(), format rupiah/tanggal/ukuran, validasi URL
  hooks/
    useApi.js      # useApi(key, fetcher, ops) + useMutation(mutator)
  components/
    ui/            # komponen shadcn (button, input, dialog, ...)
    AppShell.jsx   # bilah samping desktop + laci mobile + bilah atas
    Stepper.jsx    # indikator langkah wizard
    EmptyState.jsx # tampilan kosong + ilustrasi SVG line-art
    ConfirmDialog.jsx
    StatCard.jsx
    StatusBadge.jsx
    UploadDropzone.jsx
    ShareCard.jsx  # tautan + kode QR + unduh PNG
    PageHeader.jsx
  pages/
    Login.jsx  Register.jsx
    Dashboard.jsx
    BotWizard.jsx
    BotLayout.jsx
    BotOverview.jsx  BotChats.jsx  BotOrders.jsx
    BotFiles.jsx     BotAnalytics.jsx  BotSettings.jsx
    NotFound.jsx
```

### 4.4 Perutean

```
/login                      publik
/register                   publik
/                           terlindungi → Dashboard
/bots/new                   terlindungi → BotWizard
/bots/:id                   terlindungi → BotLayout
  (index)                   → BotOverview
  /percakapan               → BotChats
  /pesanan                  → BotOrders
  /berkas                   → BotFiles
  /analitik                 → BotAnalytics
  /pengaturan               → BotSettings
*                           → NotFound
```

`RequireAuth`: tanpa token valid → redirect `/login` dengan `state.from` agar
kembali ke halaman semula setelah masuk.

---

## 5. Sistem Desain (Green Beach)

Token mengikuti `rules/DESIGN.md`. Nilai dipetakan ke variabel CSS shadcn +
utilitas `@theme` Tailwind 4.

| Token | Nilai | Pemetaan shadcn |
|-------|-------|-----------------|
| Deep Forest | `#1B5E3F` | `--primary` gelap, header |
| Forest Green | `#2E8B57` | `--primary` |
| Meadow Green | `#3FA876` | `--primary` hover, aksen |
| Sage Green | `#5FBB97` | `--ring`, border aktif |
| Mint Whisper | `#A8DCC8` | latar lembut |
| Cream Beach | `#F0E5D8` | `--secondary`, gradien kartu |
| Charcoal | `#1A1A1A` | `--foreground` |
| Slate | `#4A4A4A` | `--muted-foreground` |
| Light Gray | `#E8E8E8` | `--border` |
| Success/Warning/Error/Info | `#10B981 / #F59E0B / #EF4444 / #3B82F6` | badge & toast |

- **Radius:** `--radius: 8px`; kartu 12px; modal 16px.
- **Tipografi:** Inter (impor Google Fonts); skala `clamp()` sesuai DESIGN.md.
- **Bayangan:** `--shadow-sm/md/lg` sesuai DESIGN.md.
- **Irama ruang:** kelipatan 8px.
- **Gradien:** kartu `linear-gradient(180deg,#FFF,#F0E5D8)`; hero/header
  `linear-gradient(135deg,#1B5E3F,#2E8B57,#3FA876)`.
- **Mode gelap:** tidak diimplementasikan.
- **Animasi:** transisi 0.2–0.3dtk; angkat halus pada kartu interaktif.

---

## 6. Wizard Pembuatan Bot (Inti)

### 6.1 Langkah

Satu pertanyaan per layar, indikator langkah di atas, tombol Lanjut/Kembali,
validasi sebelum lanjut. Draf disimpan ke `localStorage` kunci
`curabot_wizard_draft`; **kunci API tidak pernah disimpan** (hanya di memori).

| # | Langkah | Isi | Validasi |
|---|---------|-----|----------|
| 1 | Nama toko | `name` | wajib, ≤255 |
| 2 | Basis toko | pilihan: Offline / Online / Keduanya | wajib |
| 2b | Kondisional | `address` bila Offline/Keduanya; `link` bila Online/Keduanya | wajib saat tampil; `link` harus URL valid |
| 3 | Bidang usaha | chip cepat (Kuliner, Fashion, Retail, Jasa, Kecantikan, Elektronik) + isian bebas | wajib |
| 4 | Gaya respons | 4 preset + kustom | wajib satu |
| 5 | Tugas bot | textarea "apa yang Anda ingin bot lakukan" | wajib, ≥10 karakter |
| 6 | Kunci API Gemini | input kata sandi + lihat/sembunyikan, tautan bantuan AI Studio | wajib, ≥10 karakter |
| 7 | Katalog | seret-lepas multi-berkas `.pdf/.docx/.doc/.xlsx`, maks 10, 25MB/berkas | opsional |
| ✓ | Tinjauan | kartu jawaban + Ubah, pratinjau prompt, toggle edit manual | — |

### 6.2 Preset Gaya Respons

| Preset | Instruksi yang dihasilkan |
|--------|---------------------------|
| Ramah & Santai | Bahasa Indonesia ramah, hangat, santai; sapaan akrab, emoji sesekali |
| Profesional & Formal | Sopan, profesional, formal; tanpa bahasa gaul dan emoji |
| Singkat & Efisien | Singkat, langsung ke inti, maks 2–3 kalimat |
| Antusias & Persuasif | Bersemangat, tawarkan produk relevan secara natural |
| Kustom | Teks bebas pengguna |

### 6.3 Generator System Prompt (`lib/prompt.js`)

Fungsi murni `buildSystemPrompt(jawaban)` menghasilkan teks berikut:

```
Kamu adalah asisten layanan pelanggan AI untuk "{nama}", usaha di bidang {bidang}.

TENTANG TOKO
- Nama toko: {nama}
- Layanan: {deskripsi mode + alamat/link}

GAYA RESPONS
{instruksi gaya}

TUGAS UTAMA
{tugas}

ATURAN LAYANAN
{aturan sesuai mode}
```

Aturan layanan per mode:

- **Offline:** "Pesanan hanya bisa dinikmati/diambil langsung di {alamat}.
  Jangan menawarkan pengiriman. Jika pelanggan bertanya pengiriman, jelaskan
  bahwa layanan hanya tersedia di tempat."
- **Online:** "Toko hanya melayani pemesanan online dengan pengiriman ke alamat
  pelanggan. Jika pelanggan ingin datang langsung, jelaskan bahwa layanan hanya
  tersedia secara online."
- **Keduanya:** "Toko melayani makan di tempat/pengambilan di {alamat} dan
  pengiriman online. Tanyakan lebih dulu pelanggan ingin yang mana sebelum
  meminta alamat."

Generator **tidak** menduplikasi aturan anti-halusinasi, konfirmasi pesanan, dan
pembayaran karena backend (`gemini_service.py`) sudah menambahkannya.

### 6.4 Tinjauan & Persetujuan

- Kartu jawaban per langkah dengan tombol **Ubah** yang melompat ke langkah terkait.
- Pratinjau prompt dalam `<pre>` yang dapat dibuka-tutup; diregenerasi otomatis
  setiap kembali ke tinjauan.
- Toggle **Edit prompt manual** → textarea. Bila edit manual aktif lalu pengguna
  mengubah sebuah langkah, muncul dialog: "Mengubah langkah ini akan
  meregenerasi prompt dan menimpa editan manual. Lanjut?"

### 6.5 Alur Persetujuan (Accept)

Backend mengharuskan `bot_id` ada sebelum unggah berkas, sehingga urutannya:

1. `POST /api/bots/create` dengan `name`, `system_prompt` (hasil generator/edit),
   `api_key`, dan `payment_info: null`.
2. Unggah berkas katalog satu per satu ke `POST /api/files/upload`, dengan
   indikator "Mengunggah {i}/{n}…". Kegagalan dikumpulkan.
3. Redirect ke `/bots/:id` + toast sukses. Bila ada berkas gagal: toast peringatan
   dan kartu checklist "Lengkapi katalog di tab Berkas".
4. `localStorage` draf dibersihkan setelah sukses.

Penanganan galat: 422/409 dari backend ditampilkan sebagai pesan Indonesia dari
respons `message`; tombol Coba Lagi tanpa kehilangan isian.

---

## 7. Halaman

### 7.1 Masuk & Daftar

- Kartu terpusat, latar gradien lembut Green Beach.
- Validasi langsung: format email, sandi minimal 8 karakter.
- Galat 401 ("Email atau kata sandi salah") dan 409 ("Email sudah terdaftar").
- Tautan tukar halaman; setelah sukses → `/` (atau `state.from`).

### 7.2 Beranda `/`

- Kepala halaman "Bot Saya" + tombol utama "Buat Bot Baru".
- Grid kartu bot: nama, lencana status, tautan Telegram + tombol salin, tanggal
  dibuat, menu ubah (→ tab Pengaturan bot) dan hapus. Klik kartu → `/bots/:id`.
- Kerangka pemuatan (skeleton) berbentuk kartu; tampilan kosong dengan ilustrasi
  dan CTA; dialog konfirmasi sebelum hapus.

### 7.3 Tata Letak Bot `/bots/:id`

- Kepala: nama bot, lencana status, tautan + salin, tombol "Bagikan" (buka
  dialog kode QR).
- Tab: Ringkasan, Percakapan, Pesanan, Berkas, Analitik, Pengaturan.
- Isi tab dimuat saat pertama dibuka (lazy) dan di-cache; tidak memuat semua tab
  sekaligus.

### 7.4 Ringkasan

- Daftar periksa penyiapan: katalog (ada/belum), info pembayaran (ada/belum),
  QRIS (ada/belum) — tiap item menautkan ke tab terkait.
- Kartu berbagi: tautan Telegram besar + tombol salin, kode QR (qrcode.react),
  tombol unduh PNG.
- Panduan singkat 3 langkah: salin tautan → kirim ke pelanggan → pelanggan mulai
  obrolan.
- Info bot: nama, status, tautan Telegram, tanggal dibuat. (Bidang usaha tidak
  disimpan sebagai kolom backend — hanya melekat di dalam system prompt.)

### 7.5 Percakapan

- `GET /api/messages/{bot_id}` ukuran 20 + tombol "Muat lebih banyak"
  (menumpuk hasil).
- Tiap baris: cuplikan pesan masuk, jawaban bot, lencana model
  (`flash-3.6`/`flash-3.5-lite`/`none`), lama respons, waktu.
- Klik baris membuka panel samping berisi isi lengkap + data ekstraksi.
- Pencarian hanya menyaring data yang sudah dimuat (batasan backend, diberikan
  keterangan di UI).

### 7.6 Pesanan

- Saringan status di server (`?status=`) + pagination 20.
- Tabel desktop / kartu mobile: pelanggan, produk, total (format Rupiah), status,
  waktu.
- Ubah status lewat menu turun → `PUT`; memilih `rejected` membuka modal alasan
  (wajib). Backend otomatis mengabari pelanggan via Telegram.
- Rincian di panel samping: produk + jumlah + harga + catatan per item, total,
  alamat, telepon, bukti bayar (gambar), QRIS.
- Ekspor Excel: `GET .../orders/export` dengan token → blob → unduh
  `orders.xlsx`; tombol nonaktif bila 404 "belum ada ekspor".

### 7.7 Berkas

- Zona seret-lepas + pemilih berkas; validasi jenis/ukuran di peramban; batas 10
  berkas ditampilkan.
- Daftar berkas: nama, ukuran (format manusiawi), tanggal, status ekstraksi.
- Hapus dengan dialog konfirmasi.

### 7.8 Analitik

- Pemilih rentang: 7 / 30 / 90 / 365 hari (server-side `range`).
- 6 kartu metrik: Total Percakapan, Pengguna Unik, Rata-rata Respons, Total
  Pesanan, Pesanan Terekstrak, Tingkat Keberhasilan Model.
- Grafik garis `conversations_per_day`, grafik batang `orders_per_day` (recharts,
  warna Green Beach). Tampilan kosong bila seluruh nilai nol.

### 7.9 Pengaturan

- Form: nama, system prompt (textarea), kunci API (kosong = tidak diganti,
  placeholder "•••• — isi untuk mengganti"), info pembayaran (textarea).
- Unggah QRIS (JPG/PNG) + pratinjau; mengganti berkas lama.
- Simpan → `PUT`, toast sukses, invalidasi cache bot.
- Zona bahaya: hapus bot dengan konfirmasi mengetik nama bot.

---

## 8. Efisiensi Pemanggilan API

1. **Satu instance axios** (`lib/api.js`): `baseURL` dari `VITE_API_URL`
   (default `http://localhost:8000`); interceptor menyisipkan `Authorization`
   dan menangani 401 (bersihkan token → `/login`).
2. **Cache dalam memori** per kunci (`bots`, `bot:{id}`, `files:{id}`,
   `analytics:{id}:{range}`, `orders:{id}:{status}:{page}`) dengan masa simpan
   pendek (30–60 dtk).
3. **Penggabungan permintaan ganda**: permintaan identik yang masih berjalan
   berbagi promise yang sama — melindungi dari double-fetch `StrictMode`.
4. **Pembatalan**: `AbortController` saat unmount/pindah tab; cache hanya diisi
   respons yang selesai.
5. **Invalidasi terarah** setelah mutasi: ubah pesanan → invalidasi
   `orders:*` + `analytics:*`; unggah/hapus berkas → `files:{id}`;
   simpan pengaturan → `bot:{id}`.
6. **Tab bot malas**: hanya tab yang dibuka yang memanggil API.
7. **Tanpa polling**; penyegaran hanya manual (tombol).
8. **Pagination server-side** untuk percakapan dan pesanan; tidak menarik
   seluruh data.
9. **Ekspor/unduhan** sekali jalan (blob), bukan permintaan berulang.
10. **Unggah berurutan** dengan progres; tidak paralel agar tidak menabrak
    batas server dan mudah dilaporkan.

---

## 9. Status, Galat, dan Aksesibilitas

- **Pemuatan:** skeleton untuk daftar/kartu; tombol memakai spinner + nonaktif
  saat mengirim; bilah progres untuk unggahan.
- **Galat:** toast sonner untuk galat aksi; galat inline pada field form; pesan
  dari backend (Bahasa Indonesia) diprioritaskan; opsi "Coba Lagi".
- **Kosong:** komponen `EmptyState` dengan ilustrasi SVG line-art custom
  (bukan gambar stok/AI) + CTA relevan.
- **Konfirmasi:** dialog untuk aksi merusak (hapus bot/berkas, tolak pesanan).
- **Aksesibilitas:** HTML semantik, label form terhubung, fokus terlihat
  (`outline` hijau 3px), target sentuh ≥44px, `aria-live` untuk toast,
  kontras WCAG 2.1 AA, tidak ada interaksi khusus-hover di seluler.
- **Seluler pertama:** bilah samping → laci; tabel pesanan → kartu; target
  sentuh besar.

---

## 10. Verifikasi

1. `npm run lint` (oxlint) tanpa galat.
2. `npm run build` sukses.
3. Uji manual alur penuh dengan backend `http://localhost:8000`:
   - Daftar → Masuk → Beranda
   - Wizard 7 langkah → ubah jawaban dari tinjauan → edit prompt manual →
     setujui → bot tampil di Beranda
   - Tab Ringkasan: salin tautan, tampil & unduh QR
   - Berkas: unggah PDF/DOCX/XLSX, hapus
   - Pengaturan: ubah nama/info pembayaran, unggah QRIS, hapus bot
   - Pesanan: filter status, ubah status (termasuk `rejected` + alasan), ekspor
   - Percakapan: pagination "Muat lebih banyak"
   - Analitik: ganti rentang, grafik tampil
4. Periksa galat: token kedaluwarsa (401 → login), kunci API salah, berkas
   terlalu besar, bot tanpa pesanan (tampilan kosong).

---

## 11. Risiko & Mitigasi

| Risiko | Mitigasi |
|--------|----------|
| Unggah katalog gagal sebagian setelah bot dibuat | Bot tetap ada; kumpulkan kegagalan, arahkan ke tab Berkas dengan checklist |
| Instalasi shadcn pada Tailwind 4 + Vite 8 + mode JS | Ikuti dokumentasi resmi terbaru; verifikasi `components.json` `tsx:false` sebelum menambah komponen |
| Ekstraksi pesanan sia-sia tanpa katalog | Wizard menandai langkah katalog sebagai "sangat disarankan"; checklist Ringkasan mengingatkan |
| Kompatibilitas recharts dengan React 19 | Gunakan versi terbaru recharts; verifikasi saat build |
| Pencarian percakapan terbatas | Keterangan jelas di UI bahwa pencarian menyaring data termuat |

---

## 12. Kriteria Selesai

1. Seluruh halaman pada Bagian 2 berfungsi terhadap backend aktual.
2. Wizard menghasilkan system prompt yang dapat ditinjau, diubah, dan diterima;
   bot terbuat beserta unggahan katalog.
3. Tidak ada pemanggilan API berulang saat berpindah tab/navigasi dalam masa
   cache; tidak ada polling.
4. Tampilan sesuai DESIGN.md (Green Beach, Inter, irama 8px, kontras AA) dan
   responsif dari 320px.
5. Bahasa antarmuka seluruhnya Indonesia.
6. Lint + build bersih.
