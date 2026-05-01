"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { rhFetch, FormTemplate, FormQuestion, FormQuestionType } from "../../lib/rh-api"
import { redirectIfUnauthorized } from "../../lib/api"
import { RhLayout } from "./rh-layout"

const QUESTION_TYPES: { value: FormQuestionType; label: string }[] = [
  { value: "YES_NO", label: "Sim/Não" },
  { value: "TEXT", label: "Texto curto" },
  { value: "TEXTAREA", label: "Texto longo" },
  { value: "SINGLE_CHOICE", label: "Escolha única" },
  { value: "NUMBER", label: "Número" },
]

interface DraftQuestion { label: string; type: FormQuestionType; required: boolean; options: string }

function TemplateEditorModal({ template, onClose, onSave }: {
  template?: FormTemplate | null
  onClose: () => void
  onSave: () => void
}) {
  const [name, setName] = useState(template?.name ?? "")
  const [questions, setQuestions] = useState<DraftQuestion[]>(
    template?.questions.map((q) => ({ label: q.label, type: q.type, required: q.required, options: q.options.join(", ") })) ?? []
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addQuestion() {
    setQuestions([...questions, { label: "", type: "TEXT", required: false, options: "" }])
  }

  function updateQ(i: number, field: keyof DraftQuestion, value: string | boolean) {
    const next = [...questions]
    next[i] = { ...next[i], [field]: value }
    setQuestions(next)
  }

  function removeQ(i: number) {
    setQuestions(questions.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    if (!name) { setError("Informe o nome do template."); return }
    setLoading(true); setError(null)
    const body = {
      name,
      questions: questions.map((q) => ({
        label: q.label,
        type: q.type,
        required: q.required,
        options: q.type === "SINGLE_CHOICE" ? q.options.split(",").map((o) => o.trim()).filter(Boolean) : []
      }))
    }
    try {
      if (template) {
        await rhFetch(`/rh/form-templates/${template.id}`, { method: "PUT", body: JSON.stringify(body) })
      } else {
        await rhFetch("/rh/form-templates", { method: "POST", body: JSON.stringify(body) })
      }
      onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.")
    }
    setLoading(false)
  }

  return (
    <div className="rh-modal-overlay" onClick={onClose}>
      <div className="rh-modal" style={{ maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
        <h2 className="rh-modal__title">{template ? "Editar Template" : "Novo Template"}</h2>
        {template?.isLocked && (
          <div style={{ background: "#fef3c7", color: "#92400e", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            Este template está em uso. Editar criará uma nova versão.
          </div>
        )}

        <div className="rh-form-group">
          <label className="rh-label">Nome do Template *</label>
          <input className="rh-input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span className="rh-label">Perguntas</span>
            <button className="rh-btn rh-btn--secondary rh-btn--sm" onClick={addQuestion}>+ Adicionar Pergunta</button>
          </div>

          {questions.length === 0 && (
            <div style={{ color: "#94a3b8", fontSize: 14, textAlign: "center", padding: "24px 0" }}>
              Nenhuma pergunta adicionada.
            </div>
          )}

          {questions.map((q, i) => (
            <div key={i} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>Pergunta {i + 1}</span>
                <button className="rh-btn rh-btn--danger rh-btn--sm" onClick={() => removeQ(i)}>Remover</button>
              </div>
              <div className="rh-form-group">
                <label className="rh-label">Enunciado</label>
                <input className="rh-input" value={q.label} onChange={(e) => updateQ(i, "label", e.target.value)} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="rh-form-group" style={{ marginBottom: 0 }}>
                  <label className="rh-label">Tipo</label>
                  <select className="rh-select" value={q.type} onChange={(e) => updateQ(i, "type", e.target.value as FormQuestionType)}>
                    {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="rh-form-group" style={{ marginBottom: 0 }}>
                  <label className="rh-label">Obrigatória</label>
                  <div style={{ display: "flex", alignItems: "center", height: 42 }}>
                    <input type="checkbox" checked={q.required} onChange={(e) => updateQ(i, "required", e.target.checked)} style={{ width: 18, height: 18, cursor: "pointer" }} />
                    <span style={{ fontSize: 14, color: "#334155", marginLeft: 8 }}>Sim</span>
                  </div>
                </div>
              </div>
              {q.type === "SINGLE_CHOICE" && (
                <div className="rh-form-group" style={{ marginBottom: 0, marginTop: 10 }}>
                  <label className="rh-label">Opções (separadas por vírgula)</label>
                  <input className="rh-input" placeholder="Ex: Estagiário, Júnior, Pleno, Sênior" value={q.options} onChange={(e) => updateQ(i, "options", e.target.value)} />
                </div>
              )}
            </div>
          ))}
        </div>

        {error && <div className="rh-error">{error}</div>}
        <div className="rh-modal__footer">
          <button className="rh-btn rh-btn--secondary" onClick={onClose}>Cancelar</button>
          <button className="rh-btn rh-btn--primary" onClick={handleSave} disabled={loading}>
            {loading ? "Salvando..." : "Salvar Template"}
          </button>
        </div>
      </div>
    </div>
  )
}

export function RhFormTemplatesPageClient() {
  const router = useRouter()
  const [templates, setTemplates] = useState<FormTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<FormTemplate | null | "new">(null)

  async function load() {
    setLoading(true)
    try { setTemplates(await rhFetch<FormTemplate[]>("/rh/form-templates")) } catch (err) { redirectIfUnauthorized(err, () => router.replace("/login")) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function duplicate(id: string) {
    try { await rhFetch(`/rh/form-templates/${id}/duplicate`, { method: "POST" }); load() } catch {}
  }

  return (
    <RhLayout>
      <div className="rh-page-header">
        <div>
          <h1 className="rh-page-title">Templates de Formulário</h1>
          <p className="rh-page-subtitle">{templates.length} template{templates.length !== 1 ? "s" : ""} cadastrado{templates.length !== 1 ? "s" : ""}</p>
        </div>
        <button className="rh-btn rh-btn--primary" onClick={() => setModal("new")}>+ Novo Template</button>
      </div>

      {loading ? (
        <div className="rh-empty">Carregando...</div>
      ) : templates.length === 0 ? (
        <div className="rh-empty">Nenhum template cadastrado.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {templates.map((t) => (
            <div key={t.id} className="rh-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>v{t.version} · {t.questions.length} pergunta{t.questions.length !== 1 ? "s" : ""}</div>
                </div>
                {t.isLocked && (
                  <span className="rh-badge" style={{ background: "#fef3c7", color: "#92400e", fontSize: 11 }}>Em uso</span>
                )}
              </div>
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
                {t.questions.slice(0, 3).map((q) => (
                  <div key={q.id} style={{ fontSize: 13, color: "#475569", display: "flex", gap: 8, alignItems: "center" }}>
                    <span className="rh-badge" style={{ background: "#f1f5f9", color: "#64748b", fontSize: 11, flexShrink: 0 }}>
                      {QUESTION_TYPES.find((qt) => qt.value === q.type)?.label ?? q.type}
                    </span>
                    {q.label}
                  </div>
                ))}
                {t.questions.length > 3 && (
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>+{t.questions.length - 3} mais...</div>
                )}
              </div>
              <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                <button className="rh-btn rh-btn--secondary rh-btn--sm" onClick={() => setModal(t)}>Editar</button>
                <button className="rh-btn rh-btn--ghost rh-btn--sm" onClick={() => duplicate(t.id)}>Duplicar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <TemplateEditorModal
          template={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load() }}
        />
      )}
    </RhLayout>
  )
}
