"use client"

import Link, { type LinkProps } from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { type ReactNode, useEffect, useMemo, useState } from "react"
import { Icon } from "../icons"
import { clearAdminToken, getSystemUser, type SystemUser } from "../../lib/session"

export type AppShellSection = "home" | "rh" | "whatsapp" | "quiz"

type QuizView = "dashboard" | "quizzes" | "participants" | "settings"

export interface AppShellQuizNavigationItem {
  icon: "home" | "layers" | "users" | "shield"
  label: string
  mobileLabel: string
  onSelect: (view: QuizView) => void
  view: QuizView
}

interface AppShellProps {
  children: ReactNode
  quizNavigation?: {
    activeView: QuizView
    items: readonly AppShellQuizNavigationItem[]
  }
  section: AppShellSection
}

const rhLinks = [
  { href: "/rh/dashboard", label: "Entrevistas" },
  { href: "/rh/candidates", label: "Candidatos" },
  { href: "/rh/jobs", label: "Vagas" },
  { href: "/rh/form-templates", label: "Templates" }
]

const whatsappLinks = [
  { href: "/whatsapp", label: "Dashboard" },
  { href: "/whatsapp/automations", label: "Automações" },
  { href: "/whatsapp/logs", label: "Logs" },
  { href: "/whatsapp/connection", label: "Conexão" }
]

function getInitialExpanded(section: AppShellSection) {
  return {
    quiz: section === "quiz",
    rh: section === "rh",
    whatsapp: section === "whatsapp"
  }
}

function isPathActive(pathname: string | null, href: string) {
  if (!pathname) return false
  if (href === "/") return pathname === "/" || pathname === "/hub"
  return pathname === href || pathname.startsWith(`${href}/`)
}

function formatUser(user: SystemUser | null) {
  return user?.name ?? user?.username ?? user?.email ?? "Admin"
}

export function AppShell({ children, quizNavigation, section }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [expanded, setExpanded] = useState(() => getInitialExpanded(section))
  const [user, setUser] = useState<SystemUser | null>(null)

  useEffect(() => {
    setExpanded((current) => ({
      ...current,
      [section]: section !== "home"
    }))
    setUser(getSystemUser())
  }, [section])

  const userLabel = useMemo(() => formatUser(user), [user])

  function toggleGroup(group: keyof typeof expanded) {
    setExpanded((current) => ({
      ...current,
      [group]: !current[group]
    }))
  }

  function logout() {
    clearAdminToken()
    router.push("/login")
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Navegação principal">
        <Link className="app-brand" href={"/" as LinkProps<string>["href"]}>
          <span className="app-brand__mark">G</span>
          <span>
            <span className="app-brand__eyebrow">Guidance</span>
            <strong className="app-brand__name">Ops Hub</strong>
          </span>
        </Link>

        <nav className="app-nav">
          <Link
            aria-current={section === "home" ? "page" : undefined}
            className={`app-nav__item${section === "home" ? " is-active" : ""}`}
            href={"/" as LinkProps<string>["href"]}
          >
            <Icon className="h-4 w-4" name="home" />
            <span>Home</span>
          </Link>

          <div className="app-nav__group">
            <button
              aria-expanded={expanded.rh}
              className={`app-nav__item app-nav__trigger${section === "rh" ? " is-active" : ""}`}
              onClick={() => toggleGroup("rh")}
              type="button"
            >
              <Icon className="h-4 w-4" name="users" />
              <span>RH Recruiter</span>
              <span className="app-nav__chevron">⌄</span>
            </button>

            {expanded.rh ? (
              <div className="app-nav__children">
                {rhLinks.map((link) => (
                  <Link
                    aria-current={isPathActive(pathname, link.href) ? "page" : undefined}
                    className={`app-nav__child${isPathActive(pathname, link.href) ? " is-active" : ""}`}
                    href={link.href as LinkProps<string>["href"]}
                    key={link.href}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          <div className="app-nav__group">
            <button
              aria-expanded={expanded.whatsapp}
              className={`app-nav__item app-nav__trigger${section === "whatsapp" ? " is-active" : ""}`}
              onClick={() => toggleGroup("whatsapp")}
              type="button"
            >
              <Icon className="h-4 w-4" name="bolt" />
              <span>WhatsApp</span>
              <span className="app-nav__chevron">⌄</span>
            </button>

            {expanded.whatsapp ? (
              <div className="app-nav__children">
                {whatsappLinks.map((link) => (
                  <Link
                    aria-current={isPathActive(pathname, link.href) ? "page" : undefined}
                    className={`app-nav__child${isPathActive(pathname, link.href) ? " is-active" : ""}`}
                    href={link.href as LinkProps<string>["href"]}
                    key={link.href}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          <div className="app-nav__group">
            <button
              aria-expanded={expanded.quiz}
              className={`app-nav__item app-nav__trigger${section === "quiz" ? " is-active" : ""}`}
              onClick={() => toggleGroup("quiz")}
              type="button"
            >
              <Icon className="h-4 w-4" name="layers" />
              <span>Quizz</span>
              <span className="app-nav__chevron">⌄</span>
            </button>

            {expanded.quiz ? (
              <div className="app-nav__children">
                {quizNavigation ? (
                  quizNavigation.items.map((item) => (
                    <button
                      aria-current={quizNavigation.activeView === item.view ? "page" : undefined}
                      className={`app-nav__child${quizNavigation.activeView === item.view ? " is-active" : ""}`}
                      key={item.view}
                      onClick={() => item.onSelect(item.view)}
                      type="button"
                    >
                      {item.label}
                    </button>
                  ))
                ) : (
                  <Link
                    aria-current={isPathActive(pathname, "/admin-quiz") ? "page" : undefined}
                    className={`app-nav__child${isPathActive(pathname, "/admin-quiz") ? " is-active" : ""}`}
                    href={"/admin-quiz" as LinkProps<string>["href"]}
                  >
                    Dashboard
                  </Link>
                )}
              </div>
            ) : null}
          </div>
        </nav>

        <footer className="app-sidebar__footer">
          <div className="app-user">
            <span className="app-user__label">Sessão</span>
            <strong>{userLabel}</strong>
          </div>
          <button className="app-logout" onClick={logout} type="button">
            <Icon className="h-4 w-4" name="logout" />
            <span>Sair</span>
          </button>
        </footer>
      </aside>

      <main className="app-content">{children}</main>
    </div>
  )
}
