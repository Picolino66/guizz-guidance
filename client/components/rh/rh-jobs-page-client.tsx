"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { rhFetch, JobPosition } from "../../lib/rh-api"
import { redirectIfUnauthorized } from "../../lib/api"
import { RhLayout } from "./rh-layout"

function JobModal({ job, onClose, onSave }: { job?: JobPosition | null; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({
    titulo: job?.titulo ?? "",
    nivel: job?.nivel ?? "",
    descricao: job?.descricao ?? "",
    stackTags: job?.stackTags?.join(", ") ?? ""
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setLoading(true); setError(null)
    const body = { ...form, stackTags: form.stackTags.split(",").map((t) => t.trim()).filter(Boolean) }
    try {
      if (job) {
        await rhFetch(`/rh/jobs/${job.id}`, { method: "PUT", body: JSON.stringify(body) })
      } else {
        await rhFetch("/rh/jobs", { method: "POST", body: JSON.stringify(body) })
      }
      onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.")
    }
    setLoading(false)
  }

  return (
    <div className="rh-modal-overlay" onClick={onClose}>
      <div className="rh-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="rh-modal__title">{job ? "Editar Vaga" : "Nova Vaga"}</h2>
        <div className="rh-form-group">
          <label className="rh-label">Título *</label>
          <input className="rh-input" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
        </div>
        <div className="rh-form-group">
          <label className="rh-label">Nível *</label>
          <input className="rh-input" placeholder="Ex: Sênior III, Pleno II..." value={form.nivel} onChange={(e) => setForm({ ...form, nivel: e.target.value })} />
        </div>
        <div className="rh-form-group">
          <label className="rh-label">Descrição</label>
          <textarea className="rh-textarea" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        </div>
        <div className="rh-form-group">
          <label className="rh-label">Stack Tags (separadas por vírgula)</label>
          <input className="rh-input" placeholder="Ex: Angular, NestJS, PostgreSQL" value={form.stackTags} onChange={(e) => setForm({ ...form, stackTags: e.target.value })} />
        </div>
        {error && <div className="rh-error">{error}</div>}
        <div className="rh-modal__footer">
          <button className="rh-btn rh-btn--secondary" onClick={onClose}>Cancelar</button>
          <button className="rh-btn rh-btn--primary" onClick={handleSave} disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  )
}

export function RhJobsPageClient() {
  const router = useRouter()
  const [jobs, setJobs] = useState<JobPosition[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<JobPosition | null | "new">(null)

  async function load() {
    setLoading(true)
    try { setJobs(await rhFetch<JobPosition[]>("/rh/jobs")) } catch (err) { redirectIfUnauthorized(err, () => router.replace("/login")) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function remove(id: string) {
    if (!confirm("Excluir vaga?")) return
    try { await rhFetch(`/rh/jobs/${id}`, { method: "DELETE" }); load() } catch {}
  }

  return (
    <RhLayout>
      <div className="rh-page-header">
        <div>
          <h1 className="rh-page-title">Vagas</h1>
          <p className="rh-page-subtitle">{jobs.length} vaga{jobs.length !== 1 ? "s" : ""} cadastrada{jobs.length !== 1 ? "s" : ""}</p>
        </div>
        <button className="rh-btn rh-btn--primary" onClick={() => setModal("new")}>+ Nova Vaga</button>
      </div>

      <div className="rh-card">
        {loading ? <div className="rh-empty">Carregando...</div> : jobs.length === 0 ? <div className="rh-empty">Nenhuma vaga cadastrada.</div> : (
          <div className="rh-table-wrap">
            <table className="rh-table">
              <thead>
                <tr><th>Título</th><th>Nível</th><th>Stack</th><th></th></tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id}>
                    <td style={{ fontWeight: 600 }}>{j.titulo}</td>
                    <td>{j.nivel}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {j.stackTags.map((t) => (
                          <span key={t} className="rh-badge" style={{ background: "#eff6ff", color: "#1d4ed8", fontSize: 11 }}>{t}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{ display: "flex", gap: 8 }}>
                      <button className="rh-btn rh-btn--ghost rh-btn--sm" onClick={() => setModal(j)}>Editar</button>
                      <button className="rh-btn rh-btn--danger rh-btn--sm" onClick={() => remove(j.id)}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal !== null && (
        <JobModal
          job={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load() }}
        />
      )}
    </RhLayout>
  )
}
