# CuraBot

Dashboard web + REST API untuk mengelola bot Telegram berbasis AI Gemini: jawab pertanyaan dari katalog, catat pesanan, dan pandu pembayaran.

Alur data: Telegram → `POST /api/telegram/webhook` (backend, konteks katalog + Gemini) → MySQL → REST API → frontend (React).

## Fitur Utama

- Multi-bot per akun, masing-masing punya katalog, pengaturan, dan link Telegram sendiri (`t.me/<username>?start=bot_<id>`)
- Wizard 9 langkah: nama, basis, bidang, gaya, tugas, API key Gemini, katalog, pembayaran, tinjau
- Upload katalog PDF / DOCX / XLSX + foto produk + QRIS (`uploads/<bot_id>/`, batas default 25MB, 10 dokumen, 50 gambar)
- Webhook Telegram + Gemini (primary + fallback, API key per bot dienkripsi Fernet)
- Ekstraksi pesanan otomatis dengan status: menunggu, belum lengkap, dikonfirmasi, dikirim, selesai, ditolak
- Mode chat AI / manual, balas langsung dari dashboard, tandai baca, tolak pesanan dengan alasan (diteruskan ke pelanggan)
- Pembayaran transfer / QRIS / tunai, pengingat bayar via Telegram, bukti bayar foto, export pesanan ke Excel
- Analitik: grafik pesan, pesanan, response time, model AI
- Auth JWT (PyJWT) + bcrypt, validasi Pydantic (`422 {message, errors}`)

## Tech Stack

| Lapisan | Teknologi |
|---|---|
| Backend | Python 3.12, FastAPI + Uvicorn (`uv`), SQLAlchemy 2, Alembic, `google-genai`, `python-telegram-bot` |
| Database | MySQL 8 |
| Auth / Keamanan | PyJWT, bcrypt, Fernet (`cryptography`) |
| File | pypdf, python-docx, openpyxl, Pillow |
| Frontend | React 19, Vite, React Router 7, Tailwind 4 + shadcn, axios, recharts, mapbox-gl, framer-motion, sonner, next-themes |
| Tools | Docker, Postman (`postman/`), Cloudflare Tunnel (webhook saat dev lokal) |

## Struktur Repo

```
CuraBot/
├── backend/    # FastAPI + MySQL + Gemini + webhook Telegram
├── frontend/   # Dashboard React untuk pemilik usaha
├── postman/    # CuraBot.postman_collection.json, siap import
└── README.md
```

- Backend (`backend/src/app/`): `main.py` (endpoint + webhook), `models.py` (User, Bot, UploadedFile, Message, ExtractedOrder, BotChat), `schemas.py`, `gemini_service.py`, `telegram_api.py`, `payment.py`, `excel_service.py`. Detail: [`backend/README.md`](backend/README.md).
- Frontend (`frontend/src/`): `pages/` (Dashboard, BotWizard, BotChats, BotOrders, BotFiles, BotAnalytics, BotSettings), `components/`, `hooks/` (`useApi`, `useBotEvents`), `lib/` (`api.js` axios + JWT). Detail rute: [`frontend/README.md`](frontend/README.md).

## Memulai

### Prasyarat

- Python 3.12 + [`uv`](https://docs.astral.sh/uv/), Node.js 22 + npm, MySQL 8 + database kosong (misal `fastapi_curabot`)
- Token bot + username dari BotFather, API key Gemini dari Google AI Studio
- URL HTTPS publik untuk `BASE_URL` (wajib untuk webhook; saat dev lokal pakai Cloudflare Tunnel)

### Instalasi

```bash
# 1. Clone
git clone <url-repo-ini>
cd CuraBot

# 2. Backend
cd backend
cp .env.example .env   # isi DB_*, JWT_SECRET, ENCRYPTION_KEY, BASE_URL, TELEGRAM_TOKEN, dsb.
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000
```

Buat `ENCRYPTION_KEY`:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

```bash
# 3. Frontend (terminal lain)
cd frontend
npm install
npm run dev   # http://localhost:5173
```

`.env` frontend:

```env
VITE_API_URL=http://localhost:8000
VITE_MAPBOX_TOKEN=pk.xxx
```

Cek: backend `GET http://localhost:8000/api/health` → `{"status":"ok"}`, docs interaktif `http://localhost:8000/docs`.

## Penggunaan / API Reference

Alur pakai: daftar (`/register`) → buat bot (`/bots/new`) → unggah katalog (`/bots/:id/berkas`) → atur pembayaran → bagikan link Telegram → pantau Percakapan / Pesanan / Analitik.

Auth: header `Authorization: Bearer <token>`, kecuali register, login, webhook, health.

| Method | Endpoint | Deskripsi |
|---|---|---|
| `POST` | `/api/auth/register`, `/api/auth/login` | Buat akun / dapatkan JWT |
| `POST` | `/api/bots/create` | Buat bot |
| `GET` | `/api/bots/list` | Daftar bot |
| `POST` | `/api/files/upload` | Upload katalog / foto |
| `GET` | `/api/bots/{id}/conversations` | Daftar percakapan |
| `POST` | `/api/bots/{id}/conversations/{cid}/reply` | Balas chat (mode manual) |
| `GET` | `/api/bots/{id}/orders` | Daftar pesanan |
| `PUT` | `/api/bots/{id}/orders/{oid}` | Ubah status / tolak pesanan |
| `GET` | `/api/bots/{id}/orders/export` | Export pesanan (Excel) |
| `GET` | `/api/bots/{id}/analytics` | Data analitik |
| `POST` | `/api/telegram/webhook` | Webhook Telegram (internal) |

Referensi lengkap: `http://localhost:8000/docs`. Troubleshooting (webhook sepi, 401, upload ditolak, CORS): lihat README backend/frontend.