"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { rhFetch, Interview, STATUS_LABELS, STATUS_COLORS } from "../../lib/rh-api"
import { redirectIfUnauthorized } from "../../lib/api"
import { RhLayout } from "./rh-layout"

export function RhTechDashboardPageClient() {
  const router = useRouter()
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    rhFetch<Interview[]>("/rh/interviews")
      .then(setInterviews)
      .catch((err: unknown) => { redirectIfUnauthorized(err, () => router.replace("/login")) })
      .finally(() => setLoading(false))
  }, [])

  function formatDT(d: string) {
    return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  }

  const pending = interviews.filter((i) => ["WAITING_TECH_CONFIRMATION"].includes(i.status))
  const upcoming = interviews.filter((i) => i.status === "SCHEDULED")
  const others = interviews.filter((i) => !["WAITING_TECH_CONFIRMATION", "SCHEDULED"].includes(i.status))

  function InterviewCard({ i }: { i: Interview }) {
    return (
      <div className="rh-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className="rh-item__name">{i.candidate.name}</div>
            <div className="rh-item__meta">{i.jobPosition.titulo} · {i.jobPosition.nivel}</div>
          </div>
          <span className={`rh-badge ${STATUS_COLORS[i.status]}`}>{STATUS_LABELS[i.status]}</span>
        </div>

        {i.confirmedSlot && (
          <div className="rh-info-block rh-info-block--success">
            <div className="rh-info-block__label">Data confirmada</div>
            <div className="rh-info-block__value">{formatDT(i.confirmedSlot.startAt)}</div>
          </div>
        )}

        {i.status === "WAITING_TECH_CONFIRMATION" && i.slots.length > 0 && (
          <div className="rh-info-block rh-info-block--info">
            <div className="rh-info-block__label">Datas aguardando confirmação</div>
            {i.slots.filter((s) => s.status === "PROPOSED").map((s) => (
              <div key={s.id} className="rh-info-block__value">{formatDT(s.startAt)}</div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {i.jobPosition.stackTags.slice(0, 3).map((t) => (
              <span key={t} className="rh-badge rh-badge--neutral-soft" style={{ fontSize: 11 }}>{t}</span>
            ))}
          </div>
          <Link href={`/rh/tech/interviews/${i.id}`} className="rh-btn rh-btn--primary rh-btn--sm">
            Abrir →
          </Link>
        </div>
      </div>
    )
  }

  if (loading) return <RhLayout><div className="rh-empty">Carregando...</div></RhLayout>

  return (
    <RhLayout>
      <div className="rh-page-header">
        <div>
          <h1 className="rh-page-title">Minhas Entrevistas</h1>
          <p className="rh-page-subtitle">{interviews.length} atribuída{interviews.length !== 1 ? "s" : ""} a você</p>
        </div>
      </div>

      {interviews.length === 0 ? (
        <div className="rh-empty">Nenhuma entrevista atribuída a você ainda.</div>
      ) : (
        <>
          {pending.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <h2 className="rh-section__heading">Aguardando sua confirmação ({pending.length})</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
                {pending.map((i) => <InterviewCard key={i.id} i={i} />)}
              </div>
            </div>
          )}

          {upcoming.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <h2 className="rh-section__heading">Agendadas ({upcoming.length})</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
                {upcoming.map((i) => <InterviewCard key={i.id} i={i} />)}
              </div>
            </div>
          )}

          {others.length > 0 && (
            <div>
              <h2 className="rh-section__heading">Outras ({others.length})</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
                {others.map((i) => <InterviewCard key={i.id} i={i} />)}
              </div>
            </div>
          )}
        </>
      )}
    </RhLayout>
  )
}
