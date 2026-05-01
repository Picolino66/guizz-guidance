"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { rhFetch, Candidate } from "../../lib/rh-api"
import { redirectIfUnauthorized } from "../../lib/api"
import { RhLayout } from "./rh-layout"

function CandidateModal({ candidate, onClose, onSave }: { candidate?: Candidate | null; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({
    name: candidate?.name ?? "",
    linkedinUrl: candidate?.linkedinUrl ?? "",
    pretensaoSenioridade: candidate?.pretensaoSenioridade ?? "",
    cidadeEstado: candidate?.cidadeEstado ?? "",
    formacao: candidate?.formacao ?? "",
    resumoProfissional: candidate?.resumoProfissional ?? "",
    ferramentas: candidate?.ferramentas ?? "",
    motivacaoMudanca: candidate?.motivacaoMudanca ?? "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setLoading(true); setError(null)
    try {
      if (candidate) {
        await rhFetch(`/rh/candidates/${candidate.id}`, { method: "PUT", body: JSON.stringify(form) })
      } else {
        await rhFetch("/rh/candidates", { method: "POST", body: JSON.stringify(form) })
      }
      onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.")
    }
    setLoading(false)
  }

  const field = (key: keyof typeof form, label: string, type: "text" | "textarea" = "text") => (
    <div className="rh-form-group">
      <label className="rh-label">{label}</label>
      {type === "textarea"
        ? <textarea className="rh-textarea" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
        : <input className="rh-input" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
      }
    </div>
  )

  return (
    <div className="rh-modal-overlay" onClick={onClose}>
      <div className="rh-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="rh-modal__title">{candidate ? "Editar Candidato" : "Novo Candidato"}</h2>
        {field("name", "Nome completo *")}
        {field("linkedinUrl", "LinkedIn URL")}
        {field("pretensaoSenioridade", "Pretensão de Senioridade")}
        {field("cidadeEstado", "Cidade / Estado *")}
        {field("formacao", "Formação *")}
        {field("resumoProfissional", "Resumo Profissional *", "textarea")}
        {field("ferramentas", "Ferramentas *", "textarea")}
        {field("motivacaoMudanca", "Motivação para Mudança *", "textarea")}
        {error && <div className="rh-error">{error}</div>}
        <div className="rh-modal__footer">
          <button className="rh-btn rh-btn--secondary" onClick={onClose}>Cancelar</button>
          <button className="rh-btn rh-btn--primary" onClick={handleSubmit} disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  )
}

export function RhCandidatesPageClient() {
  const router = useRouter()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Candidate | null | "new">(null)
  const [search, setSearch] = useState("")

  async function load() {
    setLoading(true)
    try { setCandidates(await rhFetch<Candidate[]>("/rh/candidates")) } catch (err) { redirectIfUnauthorized(err, () => router.replace("/login")) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = candidates.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.cidadeEstado?.toLowerCase() ?? "").includes(search.toLowerCase())
  )

  async function remove(id: string) {
    if (!confirm("Excluir candidato?")) return
    try { await rhFetch(`/rh/candidates/${id}`, { method: "DELETE" }); load() } catch {}
  }

  return (
    <RhLayout>
      <div className="rh-page-header">
        <div>
          <h1 className="rh-page-title">Candidatos</h1>
          <p className="rh-page-subtitle">{candidates.length} cadastrado{candidates.length !== 1 ? "s" : ""}</p>
        </div>
        <button className="rh-btn rh-btn--primary" onClick={() => setModal("new")}>+ Novo Candidato</button>
      </div>

      <div className="rh-card">
        <div className="rh-filter-bar">
          <input className="rh-input" style={{ maxWidth: 280 }} placeholder="Buscar por nome ou cidade..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {loading ? <div className="rh-empty">Carregando...</div> : filtered.length === 0 ? <div className="rh-empty">Nenhum candidato encontrado.</div> : (
          <div className="rh-table-wrap">
            <table className="rh-table">
              <thead>
                <tr><th>Nome</th><th>Senioridade</th><th>Cidade/Estado</th><th>Formação</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      {c.linkedinUrl && <a href={c.linkedinUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#0ea5e9" }}>LinkedIn</a>}
                    </td>
                    <td>{c.pretensaoSenioridade || "—"}</td>
                    <td>{c.cidadeEstado}</td>
                    <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.formacao}</td>
                    <td style={{ display: "flex", gap: 8 }}>
                      <button className="rh-btn rh-btn--ghost rh-btn--sm" onClick={() => setModal(c)}>Editar</button>
                      <button className="rh-btn rh-btn--danger rh-btn--sm" onClick={() => remove(c.id)}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal !== null && (
        <CandidateModal
          candidate={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load() }}
        />
      )}
    </RhLayout>
  )
}
