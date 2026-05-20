'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2, Eye, EyeOff, AlertCircle, TrendingUp, Shield, Zap } from 'lucide-react'
import { saveSession } from '@/lib/auth'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://gf-cobrar.onrender.com/api/v1'

const stats = [
  { label: 'Taxa de recuperação', value: '68%', sub: 'média da carteira', color: '#10B981' },
  { label: 'Tempo de resposta', value: '< 2h', sub: 'primeiro contato', color: '#FF6600' },
  { label: 'Credores ativos', value: '12+', sub: 'na plataforma', color: '#6366F1' },
]

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
    <div className="min-h-screen flex">

      {/* ── Painel esquerdo — branding ─────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col justify-between p-12"
        style={{ background: 'linear-gradient(135deg, #0A0F1E 0%, #0D1A12 50%, #0A1520 100%)' }}>

        {/* Grade decorativa */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Blobs de luz */}
        <div className="absolute top-[-80px] left-[-80px] w-[400px] h-[400px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #10B981 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-60px] right-[-60px] w-[350px] h-[350px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #FF6600 0%, transparent 70%)' }} />
        <div className="absolute top-[40%] right-[-100px] w-[300px] h-[300px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #6366F1 0%, transparent 70%)' }} />

        {/* Logo */}
        <div className="relative z-10">
          <Image src="/logo.png" alt="GF Recebíveis" width={160} height={45} className="object-contain h-11 w-auto brightness-0 invert" priority />
        </div>

        {/* Headline */}
        <div className="relative z-10 space-y-8">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-emerald-400 mb-4">
              Plataforma de Cobrança B2B
            </p>
            <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight"
              style={{ fontFamily: 'Syne, sans-serif' }}>
              Recupere mais.<br />
              <span style={{ color: '#10B981' }}>Gerencie melhor.</span>
            </h2>
            <p className="mt-4 text-[#94A3B8] text-base leading-relaxed max-w-sm">
              Régua de cobrança inteligente, multi-credor, com negociação em tempo real via WhatsApp, boleto e PIX.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {stats.map(s => (
              <div key={s.label}
                className="rounded-2xl p-4 border"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
                <p className="text-2xl font-bold" style={{ color: s.color, fontFamily: 'Syne, sans-serif' }}>
                  {s.value}
                </p>
                <p className="text-[11px] text-white font-medium mt-1 leading-tight">{s.label}</p>
                <p className="text-[10px] mt-0.5" style={{ color: '#64748B' }}>{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Features */}
          <div className="space-y-3">
            {[
              { icon: Zap, text: 'Automação via WhatsApp, e-mail e telefone' },
              { icon: TrendingUp, text: 'Dashboard com métricas em tempo real' },
              { icon: Shield, text: 'Conformidade LGPD e acesso por perfil' },
            ].map(f => (
              <div key={f.text} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <f.icon className="w-3.5 h-3.5" style={{ color: '#10B981' }} />
                </div>
                <span className="text-sm text-[#94A3B8]">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé esquerdo */}
        <p className="relative z-10 text-[11px] text-[#334155]">
          GF Recebíveis © {new Date().getFullYear()} — Todos os direitos reservados
        </p>
      </div>

      {/* ── Painel direito — formulário ────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-[#F8FAFC]">
        <div className="w-full max-w-[400px] animate-fade-in">

          {/* Logo mobile */}
          <div className="lg:hidden mb-8 text-center">
            <Image src="/logo.png" alt="GF Recebíveis" width={140} height={40} className="object-contain h-10 w-auto mx-auto" priority />
          </div>

          {/* Cabeçalho */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#0F172A]" style={{ fontFamily: 'Syne, sans-serif' }}>
              Bem-vindo de volta
            </h1>
            <p className="text-sm text-[#64748B] mt-1">Entre com suas credenciais para acessar o sistema</p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-5">

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#374151] uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(null) }}
                placeholder="seu@email.com"
                required
                autoComplete="email"
                className="w-full text-sm bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0F172A] placeholder:text-[#CBD5E1] shadow-sm focus:outline-none focus:border-[#10B981] focus:ring-3 focus:ring-[#10B981]/10 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#374151] uppercase tracking-wider">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(null) }}
                  placeholder="••••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full text-sm bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 pr-11 text-[#0F172A] placeholder:text-[#CBD5E1] shadow-sm focus:outline-none focus:border-[#10B981] focus:ring-3 focus:ring-[#10B981]/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569] transition-colors p-0.5"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                boxShadow: loading ? undefined : '0 4px 20px rgba(16,185,129,0.35)',
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Entrar no sistema'
              )}
            </button>
          </form>

          {/* Divisor */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-[#E2E8F0]" />
            <span className="text-[11px] text-[#94A3B8] font-mono">ACESSO SEGURO</span>
            <div className="flex-1 h-px bg-[#E2E8F0]" />
          </div>

          {/* Badges de segurança */}
          <div className="flex items-center justify-center gap-4">
            {['JWT Auth', 'LGPD', 'TLS 1.3'].map(tag => (
              <div key={tag} className="flex items-center gap-1.5 text-[10px] text-[#64748B] font-mono">
                <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                {tag}
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
