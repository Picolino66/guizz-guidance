"use client"

import Link, { type LinkProps } from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  clearRhSession,
  getRhToken,
  getRhUser,
  RH_LOGIN_PATH,
  RhUser
} from "../../lib/rh-session"

interface Props { children: React.ReactNode }

const NAV_LINKS = [
  { href: "/rh/dashboard", label: "Entrevistas" },
  { href: "/rh/candidates", label: "Candidatos" },
  { href: "/rh/jobs", label: "Vagas" },
  { href: "/rh/form-templates", label: "Templates" },
]

export function RhLayout({ children }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<RhUser | null>(null)

  useEffect(() => {
    if (!getRhToken()) { router.replace(RH_LOGIN_PATH); return }
    setMounted(true)
    setUser(getRhUser())
  }, [router])

  function logout() {
    clearRhSession()
    router.push(RH_LOGIN_PATH)
  }

  if (!mounted) return null

  return (
    <div className="rh-root">
      <nav className="rh-nav">
        <div className="rh-nav__brand">
          <span>RH</span>
          <span className="rh-nav__badge">Recrutamento</span>
        </div>

        <div className="rh-nav__links">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href as LinkProps<string>["href"]}
              className={`rh-nav__link${pathname?.startsWith(l.href) ? " rh-nav__link--active" : ""}`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="rh-nav__user">
          <span>{user?.name ?? user?.email}</span>
          <span className="rh-badge">
            {user?.role}
          </span>
          <button className="rh-nav__logout" onClick={logout}>Sair</button>
        </div>
      </nav>

      <div className="rh-page">{children}</div>
    </div>
  )
}
