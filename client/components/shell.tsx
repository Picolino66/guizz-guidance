"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { Icon } from "./icons";

export function Shell({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const navigationItems = [
    { href: "/quiz-login", label: "Entrar", icon: "home", tone: "coral" },
    { href: "/waiting", label: "Espera", icon: "clock", tone: "sky" },
    { href: "/quiz", label: "Quiz", icon: "play", tone: "mint" },
    { href: "/ranking", label: "Ranking", icon: "trophy", tone: "amber" },
    { href: "/", label: "Hub", icon: "chart", tone: "lilac" }
  ] as const;

  return (
    <div className="relative overflow-hidden px-4 pb-14 pt-4 sm:px-6 sm:pt-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="surface-card surface-card-strong p-4 sm:p-5 lg:p-7">
          <div className="absolute -left-10 top-14 h-28 w-28 rounded-full bg-[rgba(255,194,5,0.2)] blur-2xl" />
          <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-[rgba(252,233,139,0.22)] blur-3xl" />
          <div className="absolute bottom-4 right-10 h-24 w-24 rounded-full bg-[rgba(255,194,5,0.14)] blur-2xl" />

          <div className="relative z-10 grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] xl:items-start">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3 rounded-[24px] bg-white/78 px-3 py-2 shadow-[0_10px_24px_rgba(125,88,70,0.08)]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#FFC205,#F0B800)] text-[#232323] shadow-[0_12px_28px_rgba(255,194,5,0.32)]">
                    <Icon className="h-5 w-5" name="sparkles" />
                  </span>
                  <div className="space-y-0.5">
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-[color:var(--muted)]">
                      Guidance Quiz
                    </p>
                    <p className="text-sm font-semibold text-[color:var(--text)]">
                      Interface gamificada em light mode
                    </p>
                  </div>
                </div>

                <span className="pill" data-tone="mint">
                  <Icon className="h-4 w-4" name="bolt" />
                  Live flow sincronizado
                </span>
              </div>

              <div className="space-y-3">
                <span className="pill" data-tone="lilac">
                  <Icon className="h-4 w-4" name="rocket" />
                  Mobile-first quiz system
                </span>

                <h1 className="max-w-[13ch] text-[clamp(2.3rem,6vw,4.6rem)] font-black leading-[0.94] tracking-[-0.06em] text-[color:var(--text)]">
                  {title}
                </h1>

                <p className="max-w-2xl text-base leading-7 text-[color:var(--muted)] sm:text-lg">
                  {subtitle}
                </p>
              </div>

              <nav className="nav-strip -mx-1 flex gap-2 overflow-x-auto pb-1">
                {navigationItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href === "/" &&
                      (pathname === "/hub" ||
                        pathname === "/" ||
                        pathname === "/login" ||
                        pathname === "/admin-quiz" ||
                        pathname === "/admin" ||
                        pathname === "/admin-guidance"));

                  return (
                    <Link
                      aria-current={isActive ? "page" : undefined}
                      className={`flex min-h-[52px] min-w-[132px] items-center gap-3 rounded-[20px] border px-4 py-3 font-semibold transition ${
                        isActive
                          ? "border-white bg-white text-[color:var(--text)] shadow-[0_16px_30px_rgba(125,88,70,0.14)]"
                          : "border-white/70 bg-white/50 text-[color:var(--muted)] hover:-translate-y-0.5 hover:bg-white/78"
                      }`}
                      href={item.href as never}
                      key={item.href}
                    >
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-2xl ${
                          item.tone === "coral"
                            ? "bg-[rgba(255,194,5,0.2)] text-[#8B6914]"
                            : item.tone === "sky"
                              ? "bg-[rgba(84,186,246,0.16)] text-[#25679f]"
                              : item.tone === "mint"
                                ? "bg-[rgba(51,197,157,0.16)] text-[#16795e]"
                                : item.tone === "amber"
                                  ? "bg-[rgba(255,194,5,0.2)] text-[#8B6914]"
                                  : "bg-[rgba(111,123,255,0.14)] text-[#5749a6]"
                        }`}
                      >
                        <Icon className="h-[18px] w-[18px]" name={item.icon} />
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="metric-tile bg-[linear-gradient(180deg,rgba(255,252,220,0.96),rgba(255,255,240,0.92))]">
                <span className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[rgba(255,194,5,0.22)] text-[#8B6914]">
                  <Icon className="h-5 w-5" name="play" />
                </span>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
                    Jornada
                  </p>
                  <p className="metric-value">1 fluxo</p>
                  <p className="text-sm leading-6 text-[color:var(--muted)]">
                    Entrada, espera, quiz e ranking com linguagem única e leitura imediata.
                  </p>
                </div>
              </div>

              <div className="metric-tile bg-[linear-gradient(180deg,rgba(252,233,139,0.4),rgba(255,252,220,0.92))]">
                <span className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[rgba(255,194,5,0.2)] text-[#8B6914]">
                  <Icon className="h-5 w-5" name="trophy" />
                </span>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
                    Destaque visual
                  </p>
                  <p className="metric-value">Top 3</p>
                  <p className="text-sm leading-6 text-[color:var(--muted)]">
                    Ranking com pódio evidente, progresso colorido e cards com profundidade suave.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="space-y-6">{children}</main>
      </div>
    </div>
  );
}
