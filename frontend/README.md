# CuraBot Frontend

Dashboard web pemilik usaha: buat bot, unggah katalog, pantau chat, proses pesanan, lihat analitik. Berbahasa Indonesia.

Berbicara ke backend via REST (`VITE_API_URL`) + JWT.

## Teknologi

- React 19 + Vite + React Router 7
- Tailwind 4 + shadcn (`components.json`), alias `@` → `src/`
- axios, recharts, mapbox-gl, framer-motion, sonner, next-themes

## Struktur folder

```
frontend/
├── src/
│   ├── App.jsx          # Routing + RequireAuth
│   ├── main.jsx         # Entry
│   ├── pages/           # Login, Register, Dashboard, BotWizard, BotLayout,
│   │                    # BotOverview, BotChats, ChatThread, BotOrders,
│   │                    # BotFiles, BotAnalytics, BotSettings, Settings, NotFound
│   ├── components/      # AppShell, AuthLayout, ui/*, UploadDropzone,
│   │                    # AddressPicker, ShareDialog, StatCard, dsb
│   ├── hooks/           # useApi.js, useBotEvents.js (realtime chat)
│   └── lib/             # api.js (axios + JWT), auth.jsx, settings.js, utils.js
├── public/
├── index.html
├── vite.config.js
└── Dockerfile           # Build → nginx
```

## Halaman / Rute

| Rute | Isi |
|---|---|
| `/login`, `/register` | Auth, token di `localStorage`, auto-logout saat 401 |
| `/` | Daftar bot + status + link Telegram |
| `/bots/new` | Wizard 9 langkah: nama, basis, bidang, gaya, tugas, API key, katalog, bayar, tinjau |
| `/bots/:id` | Overview (checklist + panduan) |
| `/bots/:id/percakapan` | Chat pelanggan, mode AI/manual, balas, tandai baca |
| `/bots/:id/pesanan` | Tabel order, filter status, ubah/tolak, reminder, export Excel |
| `/bots/:id/berkas` | Upload PDF/DOCX/XLSX + foto + QRIS, label, hapus massal |
| `/bots/:id/analitik` | Grafik pesan, order, response time, model |
| `/bots/:id/pengaturan` | Nama, prompt, key, payment, QRIS, hapus bot |
| `/pengaturan` | Tema + ukuran huruf |

## Syarat

- Node.js 22 + npm
- Backend sudah jalan

## Setup

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

`.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_MAPBOX_TOKEN=pk.xxx
```

Script: `dev`, `build`, `preview`, `lint` (oxlint), `test:unit`.

## Build & Docker

```bash
npm run build
docker build --build-arg VITE_API_URL=https://api.domain.com -t curabot-frontend .
docker run -p 80:80 curabot-frontend
```

Butuh `nginx.conf` untuk SPA fallback (refresh rute `/bots/...` tidak 404):

```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  location / { try_files $uri /index.html; }
}
```

## Troubleshooting

- 401 terus → cek `VITE_API_URL`, login ulang.
- CORS → tambahkan origin ke `CORS_ORIGINS` backend.
- Chat tidak update → cek backend hidup + koneksi realtime.
- Map kosong → `VITE_MAPBOX_TOKEN` salah.
- 404 saat refresh (Docker) → `nginx.conf` belum fallback.
