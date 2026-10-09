# CuraBot Backend

REST API untuk CuraBot: mengatur akun, bot Telegram, file katalog, percakapan, pesanan, dan webhook Telegram + AI Gemini.

Frontend (dashboard) memakai API ini. Pelanggan Telegram masuk lewat webhook, bukan lewat API ini langsung.

## Teknologi

- FastAPI + Uvicorn (Python >= 3.12, package manager `uv`)
- MySQL 8 + SQLAlchemy 2 + Alembic (migrasi)
- Auth JWT (PyJWT), password bcrypt, enkripsi API key pakai Fernet
- Gemini (`google-genai`), Telegram (via `python-telegram-bot` + webhook manual)
- Baca file: pypdf, python-docx, openpyxl, Pillow

## Struktur folder

```
backend/
├── src/app/
│   ├── main.py             # Semua endpoint + webhook Telegram
│   ├── models.py           # User, Bot, UploadedFile, Message, ExtractedOrder, BotChat, ConversationRead
│   ├── schemas.py          # Validasi request (Pydantic)
│   ├── config.py           # Baca .env (DB, CORS, upload, Gemini)
│   ├── security.py         # Hash password, JWT, encrypt/decrypt
│   ├── database.py         # Koneksi MySQL
│   ├── gemini_service.py   # Panggil Gemini + fallback model
│   ├── telegram_api.py     # Kirim pesan + pasang webhook
│   ├── payment.py          # Aturan pembayaran
│   ├── excel_service.py    # Export pesanan ke Excel
│   ├── location_service.py # Alamat / lokasi
│   └── image_markers.py    # Penanda gambar produk
├── alembic/                # Migrasi database
├── tests/                  # Test otomatis (pytest)
├── uploads/                # File per bot: uploads/<bot_id>/
├── Dockerfile
├── pyproject.toml + uv.lock
└── .env / .env.example
```

## Syarat

- Python 3.12 + `uv`
- MySQL 8 + database kosong (misal `fastapi_curabot`)
- `BASE_URL` HTTPS publik untuk webhook (misal Cloudflare Tunnel saat dev)

## Setup

```bash
cd backend
cp .env.example .env   # lalu isi (lihat tabel di bawah)
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000
```

Cek: `GET http://localhost:8000/api/health` → `{"status":"ok"}`. Docs interaktif: `http://localhost:8000/docs`.

Buat `ENCRYPTION_KEY`:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Migrasi baru setelah ubah `models.py`:

```bash
uv run alembic revision --autogenerate -m "deskripsi"
uv run alembic upgrade head
```

## Environment (.env)

| Key | Wajib | Contoh / Keterangan |
|---|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Ya | Koneksi MySQL |
| `JWT_SECRET` | Ya | Min. 32 karakter acak |
| `JWT_EXPIRE_DAYS` | Tidak | Default `30` |
| `ENCRYPTION_KEY` | Ya | Hasil `Fernet.generate_key()` |
| `BASE_URL` | Ya | URL publik backend, misal `https://xxx.trycloudflare.com` |
| `FRONTEND_URL` | Ya | Misal `http://localhost:5173` |
| `CORS_ORIGINS` | Tidak | Default pakai `FRONTEND_URL` |
| `UPLOAD_DIR` | Tidak | Default `uploads` |
| `TELEGRAM_TOKEN`, `TELEGRAM_BOT_USERNAME` | Ya | Dari BotFather |
| `GEMINI_PRIMARY`, `GEMINI_FALLBACK` | Tidak | Default `gemini-3.6-flash` / `gemini-3.5-flash-lite` |

Batas default: file 25MB, 10 dokumen/bot, 50 gambar/bot.

## Endpoint utama

Auth: header `Authorization: Bearer <token>` kecuali register, login, webhook, health.

| Grup | Endpoint |
|---|---|
| Auth | `POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/logout` |
| Bot | `POST /api/bots/create` · `GET /api/bots/list` · `GET/PUT/DELETE /api/bots/{id}` |
| File | `POST /api/files/upload` · `GET /api/files/{bot_id}` · `PATCH/DELETE /api/files/{id}` · `POST /api/bots/{id}/qris` |
| Chat | `GET /api/messages/{bot_id}` · `GET /api/bots/{id}/conversations` · `GET/POST .../conversations/{cid}/messages|reply|read|mode` |
| Order | `GET /api/bots/{id}/orders` · `PUT .../orders/{oid}` · `POST .../orders/{oid}/remind` · `GET .../orders/export` |
| Lain | `GET /api/bots/{id}/analytics` · `POST /api/telegram/webhook` · `GET /api/media/{bot_id}/{file}` · `GET /api/health` |

Validasi gagal → `422 {message, errors}`. Contoh request: `../postman/CuraBot.postman_collection.json`.

## Webhook Telegram

Saat startup, backend otomatis pasang webhook ke `$BASE_URL/api/telegram/webhook` jika `TELEGRAM_TOKEN` ada dan `BASE_URL` HTTPS. Dev lokal: jalankan tunnel, isi `BASE_URL` dengan URL tunnel, restart backend. Link per bot: `https://t.me/<username>?start=bot_<id>`.

## Test & Docker

```bash
uv run pytest -q
```

```bash
docker build -t curabot-backend .
docker run -p 8000:8000 --env-file .env curabot-backend
```

Container otomatis `alembic upgrade head` lalu jalan Uvicorn.

## Troubleshooting

- `ENCRYPTION_KEY not set` → key belum diisi / format salah.
- `401 Invalid token` → login ulang, cek `JWT_SECRET` tidak berubah-ubah.
- Webhook sepi → `BASE_URL` belum HTTPS publik / `TELEGRAM_TOKEN` salah.
- Upload ditolak → cek tipe file, ukuran, kuota per bot.
