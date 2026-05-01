"use client"

import Link from "next/link"
import type { LinkProps } from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState, type ReactNode } from "react"
import { clearAdminToken, getAdminToken, getSystemUser } from "../../lib/session"

interface Props {
  children: ReactNode
}

const NAV_LINKS = [
  { href: "/whatsapp", label: "Dashboard" },
  { href: "/whatsapp/automations", label: "Automações" },
  { href: "/whatsapp/logs", label: "Logs" },
  { href: "/whatsapp/connection", label: "Conexão" }
]

export function WhatsappLayout({ children }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<ReturnType<typeof getSystemUser>>(null)

  useEffect(() => {
    if (!getAdminToken()) {
      router.replace("/login")
      return
    }

    setMounted(true)
    setUser(getSystemUser())
  }, [router])

  function logout() {
    clearAdminToken()
    router.push("/login")
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="whatsapp-root">
      <aside className="whatsapp-shell">
        <header className="whatsapp-brand">
          <div className="whatsapp-brand__logo">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M20 11.6C20 15.6 16.4 19 11.9 19c-1 0-2-.2-2.8-.5L4 20l1.4-4.2A7.7 7.7 0 014 11.6C4 7.6 7.6 4 12 4s8 3.6 8 7.6z" />
              <path d="M9.4 9.6c.2-.4.5-.5.8-.5h.7c.3 0 .5.2.7.6l.7 1.8c.1.3.1.5 0 .7l-.4.6c-.2.3-.2.5 0 .8.4.6 1.1 1.2 1.8 1.7.3.2.6.3.8.1l.7-.4c.2-.1.5-.1.7 0l1.2.5c.4.1.6.4.5.8-.1.7-.6 1.4-1.3 1.7-.7.2-1.6.1-2.8-.3-1.4-.5-2.9-1.6-4.2-2.9-1.3-1.3-2.4-2.8-2.9-4.2-.4-1.2-.5-2.1-.3-2.8.3-.7 1-.1 1.7-.3l1 .3c.3.1.6.3.7.6l.4 1c.1.2.1.4 0 .6l-.3.5c-.1.2-.1.4 0 .6.2.4.5.9 1 1.4.4.4.8.8 1.1 1 .2.1.4.1.6 0l.5-.3c.2-.1.4-.1.6 0l1 1c.3.2.4.5.2.8" />
            </svg>
          </div>
          <div>
            <p className="whatsapp-brand__eyebrow">Guidance Ops</p>
            <h1 className="whatsapp-brand__title">WhatsApp</h1>
            <p className="whatsapp-brand__subtitle">Automação, conexão e monitoramento em um só lugar</p>
          </div>
        </header>

        <nav className="whatsapp-nav">
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href as LinkProps<string>["href"]}
              className={`whatsapp-nav__link${pathname === item.href ? " whatsapp-nav__link--active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <footer className="whatsapp-user">
          <div className="whatsapp-user__copy">
            <span className="whatsapp-user__label">Sessão admin</span>
            <strong>{user?.name ?? user?.username ?? user?.email ?? "Admin"}</strong>
          </div>
          <button className="whatsapp-user__logout" onClick={logout}>
            Sair
          </button>
        </footer>
      </aside>

      <main className="whatsapp-content">{children}</main>
    </div>
  )
}
