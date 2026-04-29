"use client"

import { FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { rhFetch } from "../../lib/rh-api"
import {
  getRhDashboardPath,
  getRhToken,
  getRhUser,
  setRhToken,
  setRhUser,
  RhUser
} from "../../lib/rh-session"

export function RhLoginPageClient() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const user = getRhUser()
    if (getRhToken() && user) {
      router.replace(getRhDashboardPath(user))
    }
  }, [router])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await rhFetch<{ accessToken: string; user: RhUser }>("/rh/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), password })
      })
      setRhToken(res.accessToken)
      setRhUser(res.user)
      router.push(getRhDashboardPath(res.user))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao autenticar.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rh-login-root">
      <div className="rh-login-card">
        <div className="rh-login-logo">RH</div>
        <h1 className="rh-login-title">RH Recrutamento</h1>
        <p className="rh-login-subtitle">Acesso exclusivo para RH e entrevistadores técnicos.</p>

        <form onSubmit={handleSubmit}>
          <div className="rh-form-group">
            <label className="rh-label" htmlFor="rh-email">E-mail</label>
            <input
              id="rh-email"
              className="rh-input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@guidance.dev"
            />
          </div>

          <div className="rh-form-group">
            <label className="rh-label" htmlFor="rh-password">Senha</label>
            <input
              id="rh-password"
              className="rh-input"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button className="rh-btn rh-btn--primary" style={{ width: "100%", justifyContent: "center" }} type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>

          {error && <div className="rh-error">{error}</div>}

          <p style={{ marginTop: 12, fontSize: 13, color: "#64748b", textAlign: "center" }}>
            Voltar ao login administrativo?{" "}
            <Link href="/login" style={{ fontWeight: 700, textDecoration: "underline" }}>
              Acessar `/login`
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
