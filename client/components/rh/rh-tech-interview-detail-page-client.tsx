"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { rhFetch, Interview, FormQuestion, STATUS_LABELS, STATUS_COLORS } from "../../lib/rh-api"
import { redirectIfUnauthorized } from "../../lib/api"
import { RhLayout } from "./rh-layout"

interface Props { id: string }

function formatDT(d: string) {
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function DynamicForm({ questions, onSubmit }: { questions: FormQuestion[]; onSubmit: (answers: any[]) => void }) {
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)

  function setAnswer(id: string, value: any) {
    setAnswers((prev) => ({ ...prev, [id]: value }))
  }

  async function handleSubmit() {
    setLoading(true)
    const payload = questions.map((q) => {
      const v = answers[q.id]
      if (q.type === "YES_NO") return { questionId: q.id, valueBoolean: v === "true" || v === true }
      if (q.type === "NUMBER") return { questionId: q.id, valueNumber: parseFloat(v) }
      if (q.type === "SINGLE_CHOICE") return { questionId: q.id, valueChoice: v }
      return { questionId: q.id, valueText: v ?? "" }
    })
    await onSubmit(payload)
    setLoading(false)
  }

  return (
    <div>
      {questions.map((q) => (
        <div key={q.id} className="rh-form-group">
          <label className="rh-label">
            {q.label}
            {q.required && <span style={{ color: "var(--color-error)" }}> *</span>}
          </label>

          {q.type === "YES_NO" && (
            <div style={{ display: "flex", gap: 12 }}>
              {["true", "false"].map((v) => (
                <label key={v} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 14 }}>
                  <input type="radio" name={q.id} value={v} checked={answers[q.id] === v} onChange={() => setAnswer(q.id, v)} />
                  {v === "true" ? "Sim" : "Não"}
                </label>
              ))}
            </div>
          )}

          {q.type === "TEXT" && (
            <input className="rh-input" value={answers[q.id] ?? ""} onChange={(e) => setAnswer(q.id, e.target.value)} />
          )}

          {q.type === "TEXTAREA" && (
            <textarea className="rh-textarea" value={answers[q.id] ?? ""} onChange={(e) => setAnswer(q.id, e.target.value)} />
          )}

          {q.type === "NUMBER" && (
            <input className="rh-input" type="number" value={answers[q.id] ?? ""} onChange={(e) => setAnswer(q.id, e.target.value)} />
          )}

          {q.type === "SINGLE_CHOICE" && (
            <select className="rh-select" value={answers[q.id] ?? ""} onChange={(e) => setAnswer(q.id, e.target.value)}>
              <option value="">Selecione...</option>
              {q.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          )}
        </div>
      ))}

      <button className="rh-btn rh-btn--primary" onClick={handleSubmit} disabled={loading} style={{ marginTop: 8 }}>
        {loading ? "Enviando..." : "Submeter Formulário"}
      </button>
    </div>
  )
}

export function RhTechInterviewDetailPageClient({ id }: Props) {
  const router = useRouter()
  const [interview, setInterview] = useState<Interview | null>(null)
  const [loading, setLoading] = useState(true)
  const [counterSlots, setCounterSlots] = useState<string[]>([""])
  const [formSuccess, setFormSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try { setInterview(await rhFetch<Interview>(`/rh/interviews/${id}`)) } catch (err) { redirectIfUnauthorized(err, () => router.replace("/login")) }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function confirmSlot(slotId: string) {
    try {
      await rhFetch(`/rh/interviews/${id}/confirm-slot`, { method: "POST", body: JSON.stringify({ slotId }) })
      load()
    } catch (err) { setError(err instanceof Error ? err.message : "Erro.") }
  }

  async function submitCounterSlots() {
    const valid = counterSlots.filter(Boolean)
    if (!valid.length) return
    try {
      await rhFetch(`/rh/interviews/${id}/counter-slots`, { method: "POST", body: JSON.stringify({ slots: valid.map((s) => ({ startAt: s })) }) })
      load()
    } catch (err) { setError(err instanceof Error ? err.message : "Erro.") }
  }

  async function markDone() {
    try {
      await rhFetch(`/rh/interviews/${id}/mark-done`, { method: "POST", body: JSON.stringify({}) })
      load()
    } catch (err) { setError(err instanceof Error ? err.message : "Erro.") }
  }

  async function submitForm(answers: any[]) {
    try {
      await rhFetch(`/rh/interviews/${id}/submission`, { method: "POST", body: JSON.stringify({ answers }) })
      setFormSuccess(true)
      load()
    } catch (err) { setError(err instanceof Error ? err.message : "Erro ao submeter formulário.") }
  }

  if (loading) return <RhLayout><div className="rh-empty">Carregando...</div></RhLayout>
  if (!interview) return <RhLayout><div className="rh-empty">Entrevista não encontrada.</div></RhLayout>

  const iv = interview
  const proposedSlots = iv.slots.filter((s) => s.status === "PROPOSED")
  const canFillForm = ["SCHEDULED", "DONE"].includes(iv.status) && iv.formTemplate && !iv.submission

  return (
    <RhLayout>
      <div className="rh-page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h1 className="rh-page-title" style={{ margin: 0 }}>{iv.candidate.name}</h1>
            <span className={`rh-badge ${STATUS_COLORS[iv.status]}`}>{STATUS_LABELS[iv.status]}</span>
          </div>
          <p className="rh-page-subtitle">{iv.jobPosition.titulo} · {iv.jobPosition.nivel}</p>
        </div>
        {iv.status === "SCHEDULED" && (
          <button className="rh-btn rh-btn--secondary" onClick={markDone}>Marcar como Realizada</button>
        )}
      </div>

      {error && <div className="rh-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          <div className="rh-card">
            <h3 className="rh-card__title">Candidato</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              {[
                ["Senioridade", iv.candidate.pretensaoSenioridade || "—"],
                ["Cidade/Estado", iv.candidate.cidadeEstado],
                ["Formação", iv.candidate.formacao],
                ["Ferramentas", iv.candidate.ferramentas],
              ].map(([l, v]) => (
                <div key={l}>
                  <div className="rh-field__label">{l}</div>
                  <div className="rh-field__value">{v}</div>
                </div>
              ))}
            </div>
            <div className="rh-field__label" style={{ marginBottom: 6 }}>Resumo profissional</div>
            <div className="rh-field__body">{iv.candidate.resumoProfissional}</div>
            <div className="rh-field__label" style={{ marginTop: 16, marginBottom: 6 }}>Motivação para mudança</div>
            <div className="rh-field__body">{iv.candidate.motivacaoMudanca}</div>
          </div>

          {iv.status === "WAITING_TECH_CONFIRMATION" && proposedSlots.length > 0 && (
            <div className="rh-card">
              <h3 className="rh-card__title">Confirmar Data</h3>
              <p className="rh-field__muted" style={{ marginBottom: 12 }}>Escolha uma das datas propostas pelo RH ou sugira novas datas.</p>

              <div className="rh-slot-list" style={{ marginBottom: 16 }}>
                {proposedSlots.map((s) => (
                  <div key={s.id} className="rh-slot rh-slot--proposed">
                    <div>
                      <div className="rh-slot__date">{formatDT(s.startAt)}</div>
                    </div>
                    <button className="rh-btn rh-btn--primary rh-btn--sm" onClick={() => confirmSlot(s.id)}>Confirmar</button>
                  </div>
                ))}
              </div>

              <div className="rh-inset-section">
                <div className="rh-inset-section__label">Ou sugira novas datas:</div>
                {counterSlots.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input className="rh-input" type="datetime-local" value={s} onChange={(e) => {
                      const next = [...counterSlots]; next[i] = e.target.value; setCounterSlots(next)
                    }} />
                    {counterSlots.length > 1 && (
                      <button className="rh-btn rh-btn--ghost rh-btn--sm" onClick={() => setCounterSlots(counterSlots.filter((_, idx) => idx !== i))}>✕</button>
                    )}
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button className="rh-btn rh-btn--ghost rh-btn--sm" onClick={() => setCounterSlots([...counterSlots, ""])}>+ Data</button>
                  <button className="rh-btn rh-btn--secondary rh-btn--sm" onClick={submitCounterSlots}>Enviar Contraproposta</button>
                </div>
              </div>
            </div>
          )}

          {canFillForm && (
            <div className="rh-card">
              <h3 className="rh-card__title" style={{ marginBottom: 4 }}>Formulário de Avaliação</h3>
              <p className="rh-field__muted" style={{ marginBottom: 20 }}>
                {iv.formTemplate!.name} · v{iv.formTemplate!.version}
              </p>
              <DynamicForm questions={iv.formTemplate!.questions} onSubmit={submitForm} />
            </div>
          )}

          {formSuccess && (
            <div className="rh-form-success-msg">
              Formulário submetido com sucesso!
            </div>
          )}

          {iv.submission && (
            <div className="rh-card">
              <h3 className="rh-card__title">Formulário submetido</h3>
              <div className="rh-field__muted">Você já submeteu o formulário para esta entrevista.</div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="rh-card">
            <h3 className="rh-card__title rh-card__title--sm">Vaga</h3>
            <div style={{ fontWeight: 600 }}>{iv.jobPosition.titulo}</div>
            <div className="rh-field__muted" style={{ marginTop: 2 }}>{iv.jobPosition.nivel}</div>
            {iv.jobPosition.descricao && <div className="rh-field__muted" style={{ marginTop: 10 }}>{iv.jobPosition.descricao}</div>}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 10 }}>
              {iv.jobPosition.stackTags.map((t) => (
                <span key={t} className="rh-badge rh-badge--info" style={{ fontSize: 11 }}>{t}</span>
              ))}
            </div>
          </div>

          {iv.confirmedSlot && (
            <div className="rh-card rh-card--success">
              <div className="rh-slot__confirmed-label">DATA CONFIRMADA</div>
              <div className="rh-slot__confirmed-value">{formatDT(iv.confirmedSlot.startAt)}</div>
            </div>
          )}
        </div>
      </div>
    </RhLayout>
  )
}
