import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, Pencil, RefreshCw, Sparkles } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

import PageHeader from '@/components/PageHeader'
import { toast } from 'sonner'

import ConfirmDialog from '@/components/ConfirmDialog'
import Stepper from '@/components/Stepper'
import UploadDropzone from '@/components/UploadDropzone'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { apiFetch, errorMessage, invalidate, uploadFile } from '@/lib/api'
import {
  buildSystemPrompt,
  EMPTY_ANSWERS,
  FIELDS,
  SERVICE_MODES,
  STYLE_PRESETS,
} from '@/lib/prompt'
import { isValidUrl } from '@/lib/utils'

const DRAFT_KEY = 'curabot_wizard_draft'

const STEP_LABELS = [
  'Nama',
  'Basis',
  'Bidang',
  'Gaya',
  'Tugas',
  'Kunci API',
  'Katalog',
  'Tinjauan',
]

const TASK_EXAMPLES = [
  'Jawab pertanyaan menu dan harga',
  'Catat pesanan pelanggan lengkap dengan jumlah',
  'Bantu jadwalkan reservasi meja',
]

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return { ...EMPTY_ANSWERS, ...parsed }
  } catch {
    return null
  }
}

function StepHeading({ title, description }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
      {description ? <p className="mt-1.5 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  )
}

function OptionCard({ selected, onClick, title, hint, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={
        selected
          ? 'rounded-xl border-2 border-primary bg-primary/5 p-4 text-left transition-colors'
          : 'rounded-xl border-2 border-border bg-background p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5'
      }
    >
      <span className="block font-semibold">{title}</span>
      {hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
    </button>
  )
}

function ReviewRow({ label, value, onEdit }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
        <p className="mt-0.5 text-sm whitespace-pre-wrap text-foreground">{value || '—'}</p>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={onEdit} className="shrink-0 gap-1.5">
        <Pencil className="size-3.5" aria-hidden="true" />
        Ubah
      </Button>
    </div>
  )
}

export default function BotWizard() {
  const navigate = useNavigate()

  const [answers, setAnswers] = useState(() => loadDraft() ?? EMPTY_ANSWERS)
  const [files, setFiles] = useState([])
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [creating, setCreating] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [manualPrompt, setManualPrompt] = useState(null)
  const [regenAsked, setRegenAsked] = useState(false)
  const [regenDialog, setRegenDialog] = useState(false)

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(answers))
  }, [answers])

  const generatedPrompt = useMemo(() => buildSystemPrompt(answers), [answers])
  const promptText = manualPrompt ?? generatedPrompt

  const handleAnswer = (patch) => {
    setAnswers((prev) => ({ ...prev, ...patch }))
    if (manualPrompt !== null && !regenAsked) {
      setRegenAsked(true)
      setRegenDialog(true)
    }
  }

  const modeLabel = SERVICE_MODES.find((item) => item.id === answers.mode)?.label ?? ''
  const styleLabel =
    answers.style === 'custom'
      ? 'Kustom'
      : (STYLE_PRESETS.find((item) => item.id === answers.style)?.label ?? '')

  const validateStep = (index) => {
    const next = {}
    if (index === 0 && !answers.name.trim()) next.name = 'Nama toko wajib diisi.'
    if (index === 1) {
      if (!answers.mode) next.mode = 'Pilih salah satu basis toko.'
      if (answers.mode && answers.mode !== 'online' && !answers.address.trim()) {
        next.address = 'Alamat toko wajib diisi.'
      }
      if (answers.mode && answers.mode !== 'offline') {
        if (!answers.link.trim()) next.link = 'Tautan toko wajib diisi.'
        else if (!isValidUrl(answers.link.trim())) {
          next.link = 'Masukkan tautan yang valid (contoh: https://tokosaya.id).'
        }
      }
    }
    if (index === 2 && !answers.field.trim()) next.field = 'Bidang usaha wajib diisi.'
    if (index === 3) {
      if (!answers.style) next.style = 'Pilih salah satu gaya respons.'
      if (answers.style === 'custom' && !answers.styleCustom.trim()) {
        next.styleCustom = 'Tulis gaya respons yang Anda inginkan.'
      }
    }
    if (index === 4 && answers.tasks.trim().length < 10) {
      next.tasks = 'Tulis minimal 10 karakter agar bot paham tugasnya.'
    }
    if (index === 5 && apiKey.trim().length < 10) {
      next.apiKey = 'Kunci API minimal 10 karakter.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const goNext = () => {
    if (!validateStep(step)) return
    setServerError('')
    setStep((value) => Math.min(value + 1, STEP_LABELS.length - 1))
    window.scrollTo({ top: 0 })
  }

  const goBack = () => {
    setServerError('')
    setStep((value) => Math.max(value - 1, 0))
    window.scrollTo({ top: 0 })
  }

  const goTo = (index) => {
    setStep(index)
    window.scrollTo({ top: 0 })
  }

  const accept = async () => {
    setServerError('')
    setCreating(true)
    try {
      const bot = await apiFetch(null, {
        method: 'post',
        url: '/api/bots/create',
        data: {
          name: answers.name.trim(),
          system_prompt: promptText,
          api_key: apiKey.trim(),
        },
      })

      let failed = 0
      for (let index = 0; index < files.length; index += 1) {
        setUploadProgress({ current: index + 1, total: files.length })
        const formData = new FormData()
        formData.append('bot_id', bot.id)
        formData.append('file', files[index])
        try {
          await uploadFile('/api/files/upload', formData)
        } catch {
          failed += 1
        }
      }

      invalidate('bots')
      localStorage.removeItem(DRAFT_KEY)
      toast.success(`Bot "${bot.name}" berhasil dibuat.`)
      if (failed > 0) {
        toast.warning(
          `${failed} berkas gagal diunggah. Lengkapi katalog di tab Berkas bot Anda.`,
        )
      }
      navigate(`/bots/${bot.id}`, { replace: true })
    } catch (caught) {
      setServerError(errorMessage(caught))
      setCreating(false)
      setUploadProgress(null)
    }
  }

  const fieldError = (key) =>
    errors[key] ? (
      <p className="text-sm text-destructive" role="alert">
        {errors[key]}
      </p>
    ) : null

  return (
    <>
      <div className="mx-auto w-full max-w-4xl">
        <PageHeader
          title="Buat Bot Baru"
          description="Jawab beberapa pertanyaan, bot Anda langsung siap."
          backTo="/"
          actions={
            <span className="text-xs font-medium text-muted-foreground">
              Langkah {Math.min(step + 1, STEP_LABELS.length)} dari {STEP_LABELS.length}
            </span>
          }
        />

        <div className="mb-6">
          <Stepper steps={STEP_LABELS} current={step} onStepClick={goTo} />
        </div>

        <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="rounded-2xl border border-border bg-background p-5 shadow-sm sm:p-8"
        >
          {step === 0 ? (
            <>
              <StepHeading
                title="Siapa nama toko Anda?"
                description="Nama ini dipakai bot saat menyapa pelanggan."
              />
              <div className="space-y-2">
                <Label htmlFor="shop-name">Nama toko</Label>
                <Input
                  id="shop-name"
                  autoFocus
                  placeholder="Contoh: Toko Kue Bu Sari"
                  value={answers.name}
                  maxLength={255}
                  onChange={(event) => handleAnswer({ name: event.target.value })}
                  aria-invalid={Boolean(errors.name)}
                />
                {fieldError('name')}
              </div>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <StepHeading
                title="Bagaimana toko Anda melayani pelanggan?"
                description="Jawaban ini menentukan cara bot menangani pemesanan dan pengiriman."
              />
              <div className="grid gap-3 sm:grid-cols-3">
                {SERVICE_MODES.map((mode) => (
                  <OptionCard
                    key={mode.id}
                    selected={answers.mode === mode.id}
                    onClick={() => handleAnswer({ mode: mode.id })}
                    title={mode.label}
                    hint={mode.hint}
                  />
                ))}
              </div>
              {fieldError('mode')}
              {answers.mode && answers.mode !== 'online' ? (
                <div className="mt-6 space-y-2">
                  <Label htmlFor="shop-address">Alamat toko</Label>
                  <Input
                    id="shop-address"
                    placeholder="Contoh: Jl. Melati No. 5, Bandung"
                    value={answers.address}
                    onChange={(event) => handleAnswer({ address: event.target.value })}
                    aria-invalid={Boolean(errors.address)}
                  />
                  {fieldError('address')}
                </div>
              ) : null}
              {answers.mode && answers.mode !== 'offline' ? (
                <div className="mt-6 space-y-2">
                  <Label htmlFor="shop-link">Tautan toko online</Label>
                  <Input
                    id="shop-link"
                    type="url"
                    placeholder="Contoh: https://tokosaya.id atau link Instagram"
                    value={answers.link}
                    onChange={(event) => handleAnswer({ link: event.target.value })}
                    aria-invalid={Boolean(errors.link)}
                  />
                  {fieldError('link')}
                </div>
              ) : null}
            </>
          ) : null}

          {step === 2 ? (
            <>
              <StepHeading
                title="Di bidang apa toko Anda bergerak?"
                description="Pilih yang paling dekat, atau tulis sendiri."
              />
              <div className="flex flex-wrap gap-2">
                {FIELDS.map((field) => (
                  <button
                    key={field}
                    type="button"
                    aria-pressed={answers.field === field}
                    onClick={() => handleAnswer({ field })}
                    className={
                      answers.field === field
                        ? 'rounded-full border-2 border-primary bg-primary/10 px-4 py-2 text-sm font-medium text-primary'
                        : 'rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground'
                    }
                  >
                    {field}
                  </button>
                ))}
              </div>
              <div className="mt-5 space-y-2">
                <Label htmlFor="shop-field">Atau tulis bidang lainnya</Label>
                <Input
                  id="shop-field"
                  placeholder="Contoh: Toko bunga"
                  value={answers.field}
                  onChange={(event) => handleAnswer({ field: event.target.value })}
                  aria-invalid={Boolean(errors.field)}
                />
                {fieldError('field')}
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <StepHeading
                title="Gaya respons seperti apa yang Anda inginkan?"
                description="Bot akan menyesuaikan cara bicaranya dengan pilihan ini."
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {STYLE_PRESETS.map((preset) => (
                  <OptionCard
                    key={preset.id}
                    selected={answers.style === preset.id}
                    onClick={() => handleAnswer({ style: preset.id })}
                    title={preset.label}
                    hint={preset.hint}
                  />
                ))}
                <OptionCard
                  selected={answers.style === 'custom'}
                  onClick={() => handleAnswer({ style: 'custom' })}
                  title="Gaya kustom"
                  hint="Tulis sendiri gaya yang Anda inginkan"
                />
              </div>
              {fieldError('style')}
              {answers.style === 'custom' ? (
                <div className="mt-5 space-y-2">
                  <Label htmlFor="style-custom">Gaya respons kustom</Label>
                  <Textarea
                    id="style-custom"
                    placeholder="Contoh: Gunakan bahasa Jawa yang halus dan panggil pelanggan dengan sebutan Mbak/Mas."
                    value={answers.styleCustom}
                    onChange={(event) => handleAnswer({ styleCustom: event.target.value })}
                    aria-invalid={Boolean(errors.styleCustom)}
                  />
                  {fieldError('styleCustom')}
                </div>
              ) : null}
            </>
          ) : null}

          {step === 4 ? (
            <>
              <StepHeading
                title="Apa yang Anda ingin bot lakukan untuk toko ini?"
                description="Jelaskan tugas utama bot dengan bahasa sehari-hari."
              />
              <div className="space-y-2">
                <Label htmlFor="shop-tasks">Tugas bot</Label>
                <Textarea
                  id="shop-tasks"
                  rows={5}
                  placeholder="Contoh: Jawab pertanyaan tentang menu dan harga, catat pesanan pelanggan, dan arahkan ke WhatsApp untuk keluhan."
                  value={answers.tasks}
                  onChange={(event) => handleAnswer({ tasks: event.target.value })}
                  aria-invalid={Boolean(errors.tasks)}
                />
                {fieldError('tasks')}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {TASK_EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() =>
                      handleAnswer({
                        tasks: answers.tasks ? `${answers.tasks}\n${example}` : example,
                      })
                    }
                    className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    + {example}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {step === 5 ? (
            <>
              <StepHeading
                title="Masukkan kunci API Gemini Anda"
                description="Bot memakai kunci ini untuk berpikir dan membalas pelanggan. Kunci disimpan terenkripsi di server dan tidak pernah kami tampilkan kembali."
              />
              <div className="space-y-2">
                <Label htmlFor="api-key">Kunci API Gemini</Label>
                <div className="relative">
                  <Input
                    id="api-key"
                    type={showKey ? 'text' : 'password'}
                    className="pr-11"
                    placeholder="AIza..."
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    aria-invalid={Boolean(errors.apiKey)}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((value) => !value)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showKey ? 'Sembunyikan kunci API' : 'Tampilkan kunci API'}
                  >
                    {showKey ? (
                      <EyeOff className="size-4.5" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4.5" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {fieldError('apiKey')}
                <p className="text-xs text-muted-foreground">
                  Belum punya? Buat gratis di{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    Google AI Studio
                  </a>
                  . Kunci hanya disimpan di server, tidak di peramban.
                </p>
              </div>
            </>
          ) : null}

          {step === 6 ? (
            <>
              <StepHeading
                title="Unggah katalog atau daftar produk (opsional)"
                description="Bot menjawab dari berkas ini. Tanpa katalog, bot belum bisa mencatat pesanan otomatis."
              />
              <UploadDropzone
                value={files}
                onChange={setFiles}
                maxFiles={10}
                hint="Sangat disarankan: unggah daftar menu/produk beserta harga agar bot dapat menjawab dan mencatat pesanan dengan benar."
              />
            </>
          ) : null}

          {step === 7 ? (
            <>
              <StepHeading
                title="Periksa kembali pengaturan bot Anda"
                description="Klik Ubah bila ada yang ingin diperbaiki. Jika sudah sesuai, buat bot Anda."
              />

              <div className="rounded-xl border border-border bg-muted/30 px-4">
                <ReviewRow label="Nama toko" value={answers.name} onEdit={() => goTo(0)} />
                <ReviewRow
                  label="Basis toko"
                  value={
                    modeLabel +
                    (answers.mode !== 'online' && answers.address ? `\nAlamat: ${answers.address}` : '') +
                    (answers.mode !== 'offline' && answers.link ? `\nTautan: ${answers.link}` : '')
                  }
                  onEdit={() => goTo(1)}
                />
                <ReviewRow label="Bidang usaha" value={answers.field} onEdit={() => goTo(2)} />
                <ReviewRow
                  label="Gaya respons"
                  value={answers.style === 'custom' ? answers.styleCustom : styleLabel}
                  onEdit={() => goTo(3)}
                />
                <ReviewRow label="Tugas bot" value={answers.tasks} onEdit={() => goTo(4)} />
                <ReviewRow
                  label="Kunci API"
                  value={apiKey ? `••••••••${apiKey.slice(-4)}` : '—'}
                  onEdit={() => goTo(5)}
                />
                <ReviewRow
                  label="Katalog"
                  value={
                    files.length > 0
                      ? files.map((file) => file.name).join(', ')
                      : 'Belum ada berkas'
                  }
                  onEdit={() => goTo(6)}
                />
              </div>

              <div className="mt-6 rounded-xl border border-border bg-background">
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4.5 text-primary" aria-hidden="true" />
                    <h3 className="text-sm font-semibold">Instruksi sistem bot</h3>
                  </div>
                  {manualPrompt === null ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setManualPrompt(generatedPrompt)
                        setRegenAsked(false)
                      }}
                    >
                      Edit manual
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setManualPrompt(null)}
                    >
                      <RefreshCw aria-hidden="true" />
                      Kembalikan otomatis
                    </Button>
                  )}
                </div>
                {manualPrompt === null ? (
                  <pre className="max-h-72 overflow-auto p-4 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
                    {generatedPrompt}
                  </pre>
                ) : (
                  <div className="p-4">
                    <Textarea
                      value={manualPrompt}
                      onChange={(event) => setManualPrompt(event.target.value)}
                      rows={14}
                      aria-label="Edit instruksi sistem bot"
                      className="text-xs"
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      Anda sedang mengedit manual. Mengubah jawaban langkah sebelumnya akan menimpa
                      editan ini.
                    </p>
                  </div>
                )}
              </div>

              {serverError ? (
                <div
                  role="alert"
                  className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                  {serverError}
                </div>
              ) : null}
            </>
          ) : null}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={step === 0 ? () => navigate('/') : goBack}
              disabled={creating}
            >
              {step === 0 ? 'Batal' : 'Kembali'}
            </Button>

            {step < STEP_LABELS.length - 1 ? (
              <Button type="button" size="lg" onClick={goNext}>
                Lanjut
              </Button>
            ) : (
              <Button type="button" size="lg" onClick={accept} disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden="true" />
                    {uploadProgress
                      ? `Mengunggah ${uploadProgress.current}/${uploadProgress.total}…`
                      : 'Membuat bot…'}
                  </>
                ) : (
                  'Buat Bot'
                )}
              </Button>
            )}
          </div>
        </motion.div>
        </AnimatePresence>
      </div>

      <ConfirmDialog
        open={regenDialog}
        onOpenChange={setRegenDialog}
        title="Regenerasi instruksi sistem?"
        description="Anda sedang mengedit instruksi sistem secara manual. Mengubah jawaban akan meregenerasi instruksi dan menimpa editan manual."
        confirmLabel="Regenerasi"
        cancelLabel="Pertahankan Editan"
        destructive={false}
        onConfirm={() => {
          setManualPrompt(null)
          setRegenDialog(false)
        }}
      />
    </>
  )
}
