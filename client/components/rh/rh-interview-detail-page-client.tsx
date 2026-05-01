"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { rhFetch, Interview, STATUS_LABELS, STATUS_COLORS, DECISION_LABELS, DECISION_COLORS, RhUserSummary } from "../../lib/rh-api"
import { getRhUser } from "../../lib/rh-session"
import { redirectIfUnauthorized } from "../../lib/api"
import { RhLayout } from "./rh-layout"

interface Props { id: string }

function formatDT(d: string) {
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function formatAction(action: string) {
  const map: Record<string, string> = {
    INTERVIEW_CREATED: "Entrevista criada",
    ASSIGNEES_ADDED: "Entrevistadores vinculados",
    SLOTS_SUGGESTED_RH: "Datas sugeridas pelo RH",
    SLOT_CONFIRMED_TECH: "Data confirmada pelo entrevistador",
    SLOTS_COUNTERED_TECH: "Contraproposta de datas",
    SLOT_APPROVED_RH: "Data aprovada pelo RH",
    INTERVIEW_MARKED_DONE: "Entrevista marcada como realizada",
    FORM_SUBMITTED: "Formulário submetido",
    INTERVIEW_CLOSED: "Entrevista encerrada",
  }
  return map[action] || action
}

export function RhInterviewDetailPageClient({ id }: Props) {
  const router = useRouter()
  const [interview, setInterview] = useState<Interview | null>(null)
  const [users, setUsers] = useState<RhUserSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [newSlotDate, setNewSlotDate] = useState("")
  const [slotError, setSlotError] = useState<string | null>(null)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  getRhUser()

  async function load() {
    try {
      const [iv, us] = await Promise.all([
        rhFetch<Interview>(`/rh/interviews/${id}`),
        rhFetch<RhUserSummary[]>("/rh/users"),
      ])
      setInterview(iv)
      setUsers(us)
    } catch (err) {
      if (redirectIfUnauthorized(err, () => router.replace("/login"))) return
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function suggestSlot() {
    if (!newSlotDate) return
    setSlotError(null)
    try {
      await rhFetch(`/rh/interviews/${id}/slots`, { method: "POST", body: JSON.stringify({ slots: [{ startAt: newSlotDate }] }) })
      setNewSlotDate("")
      load()
    } catch (err) { setSlotError(err instanceof Error ? err.message : "Erro.") }
  }

  async function confirmSlot(slotId: string) {
    await rhFetch(`/rh/interviews/${id}/confirm-slot`, { method: "POST", body: JSON.stringify({ slotId }) })
    load()
  }

  async function rhApproveSlot(slotId: string) {
    await rhFetch(`/rh/interviews/${id}/rh-approve-slot`, { method: "POST", body: JSON.stringify({ slotId }) })
    load()
  }

  async function markDone() {
    await rhFetch(`/rh/interviews/${id}/mark-done`, { method: "POST", body: JSON.stringify({}) })
    load()
  }

  async function closeInterview(decision: string) {
    await rhFetch(`/rh/interviews/${id}/close`, { method: "POST", body: JSON.stringify({ decision }) })
    load()
  }

  async function assign() {
    if (selectedUserIds.length === 0) return
    await rhFetch(`/rh/interviews/${id}/assign`, { method: "POST", body: JSON.stringify({ userIds: selectedUserIds }) })
    load()
  }

  if (loading) return <RhLayout><div className="rh-empty">Carregando...</div></RhLayout>
  if (!interview) return <RhLayout><div className="rh-empty">Entrevista não encontrada.</div></RhLayout>

  const iv = interview
  const proposedSlots = iv.slots.filter((s) => s.status === "PROPOSED")

  return (
    <RhLayout>
      <div className="rh-page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h1 className="rh-page-title" style={{ margin: 0 }}>{iv.candidate.name}</h1>
            <span className={`rh-badge ${STATUS_COLORS[iv.status]}`}>{STATUS_LABELS[iv.status]}</span>
            {iv.finalDecision && (
              <span className={`rh-badge ${DECISION_COLORS[iv.finalDecision]}`}>{DECISION_LABELS[iv.finalDecision]}</span>
            )}
          </div>
          <p className="rh-page-subtitle">{iv.jobPosition.titulo} · {iv.jobPosition.nivel}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {iv.status === "SCHEDULED" && (
            <button className="rh-btn rh-btn--secondary" onClick={markDone}>Marcar como Realizada</button>
          )}
          {(iv.status === "EVALUATED" || iv.status === "DONE") && (
            <>
              <button className="rh-btn rh-btn--primary" onClick={() => closeInterview("APPROVED")}>Aprovar</button>
              <button className="rh-btn rh-btn--danger" onClick={() => closeInterview("REJECTED")}>Reprovar</button>
              <button className="rh-btn rh-btn--secondary" onClick={() => closeInterview("HOLD")}>Em Espera</button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Candidato */}
          <div className="rh-card">
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Candidato</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                ["Senioridade pretendida", iv.candidate.pretensaoSenioridade || "—"],
                ["Cidade/Estado", iv.candidate.cidadeEstado],
                ["Formação", iv.candidate.formacao],
                ["Ferramentas", iv.candidate.ferramentas],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                  <div style={{ fontSize: 14, color: "#334155", marginTop: 2 }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Resumo</div>
              <div style={{ fontSize: 14, color: "#334155", marginTop: 4, lineHeight: 1.6 }}>{iv.candidate.resumoProfissional}</div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Motivação para mudança</div>
              <div style={{ fontSize: 14, color: "#334155", marginTop: 4, lineHeight: 1.6 }}>{iv.candidate.motivacaoMudanca}</div>
            </div>
            {iv.candidate.linkedinUrl && (
              <a href={iv.candidate.linkedinUrl} target="_blank" rel="noreferrer" className="rh-btn rh-btn--ghost rh-btn--sm" style={{ marginTop: 12 }}>
                Ver LinkedIn →
              </a>
            )}
          </div>

          {/* Slots */}
          <div className="rh-card">
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Datas Propostas</h3>
            {iv.slots.length === 0 ? (
              <div style={{ color: "#94a3b8", fontSize: 14 }}>Nenhuma data proposta ainda.</div>
            ) : (
              <div className="rh-slot-list">
                {iv.slots.map((slot) => (
                  <div key={slot.id} className={`rh-slot rh-slot--${slot.status.toLowerCase()}`}>
                    <div>
                      <div className="rh-slot__date">{formatDT(slot.startAt)}</div>
                      <div className="rh-slot__by">Por {slot.createdBy.name}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <span className={`rh-badge ${slot.status === "CONFIRMED" ? "bg-emerald-100 text-emerald-700" : slot.status === "REJECTED" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                        {slot.status === "PROPOSED" ? "Proposto" : slot.status === "CONFIRMED" ? "Confirmado" : "Recusado"}
                      </span>
                      {slot.status === "PROPOSED" && iv.status === "WAITING_TECH_CONFIRMATION" && (
                        <button className="rh-btn rh-btn--primary rh-btn--sm" onClick={() => confirmSlot(slot.id)}>Confirmar</button>
                      )}
                      {slot.status === "PROPOSED" && iv.status === "WAITING_RH_APPROVAL" && (
                        <button className="rh-btn rh-btn--primary rh-btn--sm" onClick={() => rhApproveSlot(slot.id)}>Aprovar</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {["DRAFT", "SCHEDULING"].includes(iv.status) && (
              <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                <input
                  className="rh-input"
                  type="datetime-local"
                  value={newSlotDate}
                  onChange={(e) => setNewSlotDate(e.target.value)}
                />
                <button className="rh-btn rh-btn--secondary" onClick={suggestSlot}>+ Sugerir Data</button>
              </div>
            )}
            {slotError && <div className="rh-error" style={{ marginTop: 8 }}>{slotError}</div>}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Entrevistadores */}
          <div className="rh-card">
              <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Entrevistadores</h3>
              {iv.assignees.length === 0
                ? <div style={{ color: "#94a3b8", fontSize: 14, marginBottom: 12 }}>Nenhum vinculado.</div>
                : iv.assignees.map((a) => (
                  <div key={a.user.id} style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: 14, color: "#334155" }}>
                    {a.user.name}
                  </div>
                ))}
              <div style={{ marginTop: 12 }}>
                <select
                  className="rh-select"
                  multiple
                  style={{ height: 100 }}
                  value={selectedUserIds}
                  onChange={(e) => setSelectedUserIds(Array.from(e.target.selectedOptions, (o) => o.value))}
                >
                  {users.filter((u) => !iv.assignees.some((a) => a.user.id === u.id)).map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                <button className="rh-btn rh-btn--secondary rh-btn--sm" style={{ marginTop: 8 }} onClick={assign}>
                  + Vincular Selecionados
                </button>
              </div>
          </div>

          {/* Vaga */}
          <div className="rh-card">
            <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Vaga</h3>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{iv.jobPosition.titulo}</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{iv.jobPosition.nivel}</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 10 }}>
              {iv.jobPosition.stackTags.map((t) => (
                <span key={t} className="rh-badge" style={{ background: "#eff6ff", color: "#1d4ed8", fontSize: 11 }}>{t}</span>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="rh-card">
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Histórico</h3>
            <div className="rh-timeline">
              {iv.auditLogs.map((log, i) => (
                <div key={log.id} className="rh-timeline-item">
                  <div className={`rh-timeline-dot${i === iv.auditLogs.length - 1 ? " rh-timeline-dot--active" : " rh-timeline-dot--done"}`}>
                    {i + 1}
                  </div>
                  <div className="rh-timeline-content">
                    <div className="rh-timeline-action">{formatAction(log.action)}</div>
                    <div className="rh-timeline-meta">
                      {log.actor?.name && <>{log.actor.name} · </>}
                      {formatDT(log.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </RhLayout>
  )
}
