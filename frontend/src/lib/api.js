import axios from 'axios'

export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export const api = axios.create({ baseURL: API_BASE, timeout: 30000 })

const TOKEN_KEY = 'curabot_token'
const EMAIL_KEY = 'curabot_email'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function getStoredEmail() {
  return localStorage.getItem(EMAIL_KEY)
}

export function setStoredEmail(email) {
  if (email) localStorage.setItem(EMAIL_KEY, email)
  else localStorage.removeItem(EMAIL_KEY)
}

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      setToken(null)
      window.dispatchEvent(new CustomEvent('curabot:unauthorized'))
    }
    return Promise.reject(error)
  },
)

export class ApiError extends Error {
  constructor(message, status, errors) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

const MESSAGE_MAP = [
  [/email already registered/i, 'Email sudah terdaftar.'],
  [/invalid email or password/i, 'Email atau kata sandi salah.'],
  [/bot not found/i, 'Bot tidak ditemukan.'],
  [/file not found/i, 'Berkas tidak ditemukan.'],
  [/order not found/i, 'Pesanan tidak ditemukan.'],
  [/payment proof already received/i, 'Bukti pembayaran order ini sudah diterima.'],
  [/customer chat not found/i, 'Chat customer tidak ditemukan di Telegram.'],
  [/failed to send telegram reminder.*/i, 'Gagal mengirim pengingat via Telegram. Coba lagi.'],
  [/failed to send telegram message.*/i, 'Gagal mengirim pesan via Telegram. Coba lagi.'],
  [/max (\d+) files per bot/i, 'Batas maksimal $1 berkas per bot sudah tercapai.'],
  [/only pdf, docx, and xlsx allowed/i, 'Hanya berkas PDF, DOCX, dan XLSX yang diizinkan.'],
  [/file too large \(max (\d+)mb\)/i, 'Berkas terlalu besar (maksimal $1MB).'],
  [/file too large/i, 'Berkas terlalu besar.'],
  [/only jpg\/png allowed/i, 'Hanya gambar JPG/PNG yang diizinkan.'],
  [/no orders exported yet/i, 'Belum ada ekspor pesanan untuk bot ini.'],
  [/system_prompt must be at least/i, 'Instruksi sistem minimal 10 karakter.'],
  [/link ini sudah terhubung/i, 'Link ini sudah terhubung.'],
  [/hanya link docs\.google\.com.*/i, 'Hanya link docs.google.com / drive.google.com.'],
  [/sync gagal.*/i, 'Sinkronisasi Google gagal. Cek share akses.'],
  [/verifikasi gagal.*/i, '$&'],
  [/terhubung tapi verifikasi gagal.*/i, '$&'],
]

function mapDetail(detail) {
  if (typeof detail !== 'string') return null
  for (const [pattern, replacement] of MESSAGE_MAP) {
    if (pattern.test(detail)) return detail.replace(pattern, replacement)
  }
  return null
}

export function errorMessage(error) {
  if (error instanceof ApiError) return error.message
  const response = error?.response
  if (!response) return 'Tidak dapat terhubung ke server. Periksa koneksi Anda lalu coba lagi.'
  const mapped = mapDetail(response.data?.message ?? response.data?.detail)
  if (mapped) return mapped
  const status = response.status
  if (status === 400) return 'Permintaan tidak dapat diproses.'
  if (status === 401) return 'Sesi Anda berakhir. Silakan masuk kembali.'
  if (status === 403) return 'Anda tidak memiliki akses.'
  if (status === 404) return 'Data tidak ditemukan.'
  if (status === 409) return 'Data sudah terdaftar.'
  if (status === 422) return 'Periksa kembali data yang Anda isi.'
  if (status >= 500) return 'Terjadi gangguan di server. Coba lagi nanti.'
  return 'Terjadi kesalahan. Coba lagi.'
}

const cache = new Map()
const inflight = new Map()

export async function apiFetch(key, options = {}) {
  const { method = 'get', url, params, data, ttl = 45000, force = false } = options
  const cacheable = method === 'get' && key
  const cacheKey = cacheable && params ? `${key}:${new URLSearchParams(params)}` : key

  if (cacheable && !force) {
    const hit = cache.get(cacheKey)
    if (hit && hit.expires > Date.now()) return hit.data
    if (inflight.has(cacheKey)) return inflight.get(cacheKey)
  }

  const request = api({ method, url, params, data })
    .then((response) => {
      if (cacheable) cache.set(cacheKey, { data: response.data, expires: Date.now() + ttl })
      return response.data
    })
    .finally(() => {
      if (cacheable) inflight.delete(cacheKey)
    })

  if (cacheable && !force) inflight.set(cacheKey, request)
  return request
}

export function invalidate(prefix) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key)
  }
}

export async function uploadFile(url, formData, { onProgress } = {}) {
  const response = await api.post(url, formData, {
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    },
  })
  return response.data
}

export async function downloadFile(url, filename) {
  const response = await api.get(url, { responseType: 'blob' })
  const blobUrl = URL.createObjectURL(response.data)
  const anchor = document.createElement('a')
  anchor.href = blobUrl
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(blobUrl)
}
