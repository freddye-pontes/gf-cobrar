'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { saveSession } from '@/lib/auth'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://gf-cobrar.onrender.com/api/v1'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const form = new URLSearchParams()
      form.append('username', email)
      form.append('password', password)

      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail ?? 'Email ou senha inválidos')
      }

      const data = await res.json()
      saveSession(data.access_token, { nome: data.nome, email: data.email })
      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo / Marca */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald mb-4 shadow-lg">
            <span className="text-white font-bold text-xl" style={{ fontFamily: 'Syne, sans-serif' }}>GF</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]" style={{ fontFamily: 'Syne, sans-serif' }}>
            GF Recebíveis
          </h1>
          <p className="text-sm text-[#64748B] mt-1">Acesse sua conta para continuar</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(null) }}
                placeholder="seu@email.com"
                required
                autoComplete="email"
                className="w-full text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-[#1A1A1A] placeholder:text-[#94A3B8] focus:outline-none focus:border-emerald/60 focus:ring-2 focus:ring-emerald/10 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wider">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(null) }}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 pr-10 text-[#1A1A1A] placeholder:text-[#94A3B8] focus:outline-none focus:border-emerald/60 focus:ring-2 focus:ring-emerald/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald hover:bg-emerald-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm mt-2"
              style={{ backgroundColor: loading ? undefined : '#10B981' }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#94A3B8] mt-6">
          GF Recebíveis © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
