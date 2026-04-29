"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { rhFetch, Candidate, JobPosition, FormTemplate } from "../../lib/rh-api"
import { RhLayout } from "./rh-layout"

export function RhInterviewNewPageClient() {
  const router = useRouter()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [jobs, setJobs] = useState<JobPosition[]>([])
  const [templates, setTemplates] = useState<FormTemplate[]>([])
  const [form, setForm] = useState({ candidateId: "", jobPositionId: "", templateId: "" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      rhFetch<Candidate[]>("/rh/candidates"),
      rhFetch<JobPosition[]>("/rh/jobs"),
      rhFetch<FormTemplate[]>("/rh/form-templates"),
    ]).then(([c, j, t]) => { setCandidates(c); setJobs(j); setTemplates(t) }).catch(() => {})
  }, [])

  async function handleSubmit() {
    if (!form.candidateId || !form.jobPositionId) { setError("Selecione candidato e vaga."); return }
    setLoading(true); setError(null)
    try {
      const interview = await rhFetch<{ id: string }>("/rh/interviews", {
        method: "POST",
        body: JSON.stringify({ ...form, templateId: form.templateId || undefined })
      })
      router.push(`/rh/interviews/${interview.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar entrevista.")
    }
    setLoading(false)
  }

  return (
    <RhLayout>
      <div className="rh-page-header">
        <div>
          <h1 className="rh-page-title">Nova Entrevista</h1>
          <p className="rh-page-subtitle">Preencha os dados para criar uma nova entrevista técnica</p>
        </div>
      </div>

      <div className="rh-card" style={{ maxWidth: 600 }}>
        <div className="rh-form-group">
          <label className="rh-label">Candidato *</label>
          <select className="rh-select" value={form.candidateId} onChange={(e) => setForm({ ...form, candidateId: e.target.value })}>
            <option value="">Selecione um candidato...</option>
            {candidates.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.pretensaoSenioridade || c.cidadeEstado}</option>)}
          </select>
        </div>

        <div className="rh-form-group">
          <label className="rh-label">Vaga *</label>
          <select className="rh-select" value={form.jobPositionId} onChange={(e) => setForm({ ...form, jobPositionId: e.target.value })}>
            <option value="">Selecione uma vaga...</option>
            {jobs.map((j) => <option key={j.id} value={j.id}>{j.titulo} — {j.nivel}</option>)}
          </select>
        </div>

        <div className="rh-form-group">
          <label className="rh-label">Template de Formulário (opcional)</label>
          <select className="rh-select" value={form.templateId} onChange={(e) => setForm({ ...form, templateId: e.target.value })}>
            <option value="">Nenhum template</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name} v{t.version}</option>)}
          </select>
        </div>

        {error && <div className="rh-error">{error}</div>}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
          <button className="rh-btn rh-btn--secondary" onClick={() => router.back()}>Cancelar</button>
          <button className="rh-btn rh-btn--primary" onClick={handleSubmit} disabled={loading}>
            {loading ? "Criando..." : "Criar Entrevista"}
          </button>
        </div>
      </div>
    </RhLayout>
  )
}
