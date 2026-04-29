"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { rhFetch, Interview, InterviewStatus, STATUS_LABELS, STATUS_COLORS } from "../../lib/rh-api"
import { getRhToken, RH_LOGIN_PATH } from "../../lib/rh-session"
import { RhLayout } from "./rh-layout"

export function RhDashboardPageClient() {
  const router = useRouter()
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState("")

  useEffect(() => {
    if (!getRhToken()) { router.replace(RH_LOGIN_PATH); return }
    load()
  }, [router])

  async function load() {
    setLoading(true)
    try {
      const params = filterStatus ? `?status=${filterStatus}` : ""
      const data = await rhFetch<Interview[]>(`/rh/interviews${params}`)
      setInterviews(data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [filterStatus])

  const statuses: InterviewStatus[] = ["DRAFT", "SCHEDULING", "WAITING_TECH_CONFIRMATION", "WAITING_RH_APPROVAL", "SCHEDULED", "DONE", "EVALUATED", "CLOSED"]

  const counts = statuses.reduce((acc, s) => {
    acc[s] = interviews.filter((i) => i.status === s).length
    return acc
  }, {} as Record<string, number>)

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
  }

  return (
    <RhLayout>
      <div className="rh-page-header">
        <div>
          <h1 className="rh-page-title">Entrevistas</h1>
          <p className="rh-page-subtitle">{interviews.length} entrevista{interviews.length !== 1 ? "s" : ""} no total</p>
        </div>
        <Link href="/rh/interviews/new" className="rh-btn rh-btn--primary">+ Nova Entrevista</Link>
      </div>

      <div className="rh-stats">
        {[
          { label: "Total", value: interviews.length, sub: "entrevistas" },
          { label: "Agendadas", value: counts["SCHEDULED"] || 0, sub: "confirmadas" },
          { label: "Aguardando", value: (counts["WAITING_TECH_CONFIRMATION"] || 0) + (counts["WAITING_RH_APPROVAL"] || 0), sub: "confirmação" },
          { label: "Encerradas", value: (counts["EVALUATED"] || 0) + (counts["CLOSED"] || 0), sub: "finalizadas" },
        ].map((s) => (
          <div className="rh-stat" key={s.label}>
            <div className="rh-stat__label">{s.label}</div>
            <div className="rh-stat__value">{s.value}</div>
            <div className="rh-stat__sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="rh-card">
        <div className="rh-filter-bar">
          <select className="rh-select" style={{ maxWidth: 220 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Todos os status</option>
            {statuses.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="rh-empty">Carregando...</div>
        ) : interviews.length === 0 ? (
          <div className="rh-empty">Nenhuma entrevista encontrada.</div>
        ) : (
          <div className="rh-table-wrap">
            <table className="rh-table">
              <thead>
                <tr>
                  <th>Candidato</th>
                  <th>Vaga</th>
                  <th>Entrevistadores</th>
                  <th>Status</th>
                  <th>Data Conf.</th>
                  <th>Criado em</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {interviews.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{i.candidate.name}</div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>{i.candidate.pretensaoSenioridade || "—"}</div>
                    </td>
                    <td>
                      <div>{i.jobPosition.titulo}</div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>{i.jobPosition.nivel}</div>
                    </td>
                    <td>
                      {i.assignees.length === 0
                        ? <span style={{ color: "#94a3b8", fontSize: 13 }}>—</span>
                        : i.assignees.map((a) => (
                          <div key={a.user.id} style={{ fontSize: 13 }}>{a.user.name}</div>
                        ))}
                    </td>
                    <td>
                      <span className={`rh-badge ${STATUS_COLORS[i.status]}`}>{STATUS_LABELS[i.status]}</span>
                    </td>
                    <td>
                      {i.confirmedSlot
                        ? <span style={{ fontWeight: 600, color: "#15803d" }}>{formatDate(i.confirmedSlot.startAt)}</span>
                        : <span style={{ color: "#94a3b8" }}>—</span>}
                    </td>
                    <td style={{ color: "#94a3b8", fontSize: 13 }}>{formatDate(i.createdAt)}</td>
                    <td>
                      <Link href={`/rh/interviews/${i.id}`} className="rh-btn rh-btn--ghost rh-btn--sm">Ver →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </RhLayout>
  )
}
