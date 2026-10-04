import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

import AuthLayout from '@/components/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'

const EMAIL_PATTERN = /\S+@\S+\.\S+/

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: '', password: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const update = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))

  const validate = () => {
    const errors = {}
    if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = 'Masukkan email yang valid.'
    if (form.password.length < 8) errors.password = 'Kata sandi minimal 8 karakter.'
    if (form.confirm !== form.password) errors.confirm = 'Konfirmasi kata sandi tidak sama.'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setServerError('')
    if (!validate()) return
    setSubmitting(true)
    try {
      await register(form.email.trim(), form.password)
      navigate('/', { replace: true })
    } catch (caught) {
      setServerError(errorMessage(caught))
    } finally {
      setSubmitting(false)
    }
  }

  const passwordToggle = (
    <button
      type="button"
      onClick={() => setShowPassword((value) => !value)}
      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
      aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
    >
      {showPassword ? (
        <EyeOff className="size-4.5" aria-hidden="true" />
      ) : (
        <Eye className="size-4.5" aria-hidden="true" />
      )}
    </button>
  )

  return (
    <AuthLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Buat akun CuraBot</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Gratis. Cukup email dan kata sandi untuk mulai membuat bot pertama Anda.
        </p>
      </div>

      {serverError ? (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {serverError}
        </div>
      ) : null}

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="nama@email.com"
            value={form.email}
            onChange={update('email')}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          />
          {fieldErrors.email ? (
            <p id="email-error" className="text-sm text-destructive">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Kata sandi</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Minimal 8 karakter"
              className="pr-11"
              value={form.password}
              onChange={update('password')}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            />
            {passwordToggle}
          </div>
          {fieldErrors.password ? (
            <p id="password-error" className="text-sm text-destructive">
              {fieldErrors.password}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">Konfirmasi kata sandi</Label>
          <div className="relative">
            <Input
              id="confirm"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Ulangi kata sandi"
              className="pr-11"
              value={form.confirm}
              onChange={update('confirm')}
              aria-invalid={Boolean(fieldErrors.confirm)}
              aria-describedby={fieldErrors.confirm ? 'confirm-error' : undefined}
            />
            {passwordToggle}
          </div>
          {fieldErrors.confirm ? (
            <p id="confirm-error" className="text-sm text-destructive">
              {fieldErrors.confirm}
            </p>
          ) : null}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Membuat akun…
            </>
          ) : (
            'Daftar'
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Sudah punya akun?{' '}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Masuk
        </Link>
      </p>
    </AuthLayout>
  )
}
