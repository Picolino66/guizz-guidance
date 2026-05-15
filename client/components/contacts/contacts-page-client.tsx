"use client"

import { useEffect, useState } from "react"
import { AppShell } from "../layout/app-shell"
import { Icon } from "../icons"
import { Button } from "../ui/button"
import { redirectIfUnauthorized } from "../../lib/api"
import { contactsFetch, type Contact, type ContactListResponse } from "../../lib/contacts-api"
import { useRequireInternalSession } from "../../lib/internal-session"

type ContactFormState = {
  name: string
  company: string
  email: string
  phoneNumber: string
}

const PAGE_SIZE = 10

const INITIAL_FORM: ContactFormState = {
  name: "",
  company: "",
  email: "",
  phoneNumber: ""
}

export function ContactsPageClient() {
  const session = useRequireInternalSession()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [form, setForm] = useState<ContactFormState>(INITIAL_FORM)
  const [editingContactId, setEditingContactId] = useState<string | null>(null)
  const [editingForm, setEditingForm] = useState<ContactFormState>(INITIAL_FORM)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingContactId, setSavingContactId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  async function loadContacts(nextPage = page, nextSearch = search) {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: String(PAGE_SIZE)
      })

      if (nextSearch.trim()) {
        params.set("search", nextSearch.trim())
      }

      const data = await contactsFetch<ContactListResponse>(`/contacts?${params.toString()}`)
      setContacts(data.items)
      setPage(data.page)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch (err) {
      if (redirectIfUnauthorized(err, () => window.location.assign("/login"))) {
        return
      }

      setError(err instanceof Error ? err.message : "Não foi possível carregar os contatos.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session.isChecking || !session.token) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      void loadContacts(page, search)
    }, 250)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [session.isChecking, session.token, page, search])

  useEffect(() => {
    setPage(1)
  }, [search])

  if (session.isChecking || !session.token) {
    return null
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      await contactsFetch<Contact>("/contacts", {
        method: "POST",
        body: JSON.stringify(form)
      })

      setForm(INITIAL_FORM)
      setSuccessMessage("Contato salvo com sucesso.")
      await loadContacts(1, search)
    } catch (err) {
      if (redirectIfUnauthorized(err, () => window.location.assign("/login"))) {
        return
      }

      setError(err instanceof Error ? err.message : "Não foi possível salvar o contato.")
    } finally {
      setSaving(false)
    }
  }

  function startEditing(contact: Contact) {
    setEditingContactId(contact.id)
    setEditingForm({
      name: contact.name ?? "",
      company: contact.company ?? "",
      email: contact.email ?? "",
      phoneNumber: contact.phoneNumber ?? ""
    })
    setError(null)
    setSuccessMessage(null)
  }

  function cancelEditing() {
    setEditingContactId(null)
    setEditingForm(INITIAL_FORM)
  }

  async function handleSaveContact(contactId: string) {
    setSavingContactId(contactId)
    setError(null)
    setSuccessMessage(null)

    try {
      await contactsFetch<Contact>(`/contacts/${contactId}`, {
        method: "PATCH",
        body: JSON.stringify(editingForm)
      })

      setSuccessMessage("Contato atualizado com sucesso.")
      setEditingContactId(null)
      setEditingForm(INITIAL_FORM)
      await loadContacts(page, search)
    } catch (err) {
      if (redirectIfUnauthorized(err, () => window.location.assign("/login"))) {
        return
      }

      setError(err instanceof Error ? err.message : "Não foi possível atualizar o contato.")
    } finally {
      setSavingContactId(null)
    }
  }

  return (
    <AppShell section="contacts">
      <div className="contacts-page">
        <header className="contacts-page__hero">
          <div>
            <p className="contacts-page__eyebrow">Agenda interna</p>
            <h1 className="contacts-page__title">Contatos</h1>
          </div>

          <div className="contacts-page__summary ui-status ui-status--accent">
            {total} contato{total !== 1 ? "s" : ""}
          </div>
        </header>

        {error ? <div className="contacts-page__alert contacts-page__alert--error">{error}</div> : null}
        {successMessage ? <div className="contacts-page__alert contacts-page__alert--success">{successMessage}</div> : null}

        <div className="contacts-page__grid">
          <section className="ui-card contacts-card">
            <div className="contacts-card__header">
              <div>
                <p className="contacts-card__eyebrow">Base salva</p>
                <h2 className="contacts-card__title">Lista de contatos</h2>
              </div>

              <label className="ui-field contacts-card__search">
                <span>Buscar</span>
                <input
                  className="ui-input"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Nome, e-mail ou telefone"
                  value={search}
                />
              </label>
            </div>

            {loading ? (
              <div className="ui-empty">
                <p className="ui-empty__title">Carregando contatos</p>
                <p className="ui-empty__text">Buscando a base atual de contatos.</p>
              </div>
            ) : contacts.length === 0 ? (
              <div className="ui-empty">
                <p className="ui-empty__title">Nenhum contato encontrado</p>
                <p className="ui-empty__text">Ajuste a busca ou crie um novo contato ao lado.</p>
              </div>
            ) : (
              <>
                <div className="contacts-list">
                  {contacts.map((contact) => {
                    const isEditing = editingContactId === contact.id

                    return (
                  <article className="contacts-list__item" key={contact.id}>
                    {isEditing ? (
                      <div className="contacts-inline-form">
                        <label className="ui-field">
                          <span>Nome</span>
                          <input
                            className="ui-input"
                            onChange={(event) => setEditingForm((current) => ({ ...current, name: event.target.value }))}
                            value={editingForm.name}
                          />
                        </label>

                        <label className="ui-field">
                          <span>E-mail</span>
                          <input
                            className="ui-input"
                            onChange={(event) => setEditingForm((current) => ({ ...current, email: event.target.value }))}
                            value={editingForm.email}
                          />
                        </label>

                        <label className="ui-field">
                          <span>Empresa</span>
                          <input
                            className="ui-input"
                            onChange={(event) => setEditingForm((current) => ({ ...current, company: event.target.value }))}
                            value={editingForm.company}
                          />
                        </label>

                        <label className="ui-field">
                          <span>Telefone</span>
                          <input
                            className="ui-input"
                            onChange={(event) => setEditingForm((current) => ({ ...current, phoneNumber: event.target.value }))}
                            value={editingForm.phoneNumber}
                          />
                        </label>

                        <div className="contacts-inline-form__actions">
                          <Button
                            isLoading={savingContactId === contact.id}
                            loadingLabel="Salvando..."
                            onClick={() => void handleSaveContact(contact.id)}
                            size="sm"
                            variant="primary"
                          >
                            Salvar
                          </Button>
                          <Button onClick={cancelEditing} size="sm" variant="ghost">
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="contacts-list__main">
                          <strong>{contact.name ?? contact.email ?? contact.phoneNumber ?? "Contato sem identificação"}</strong>
                          <p>{contact.company ?? "Sem empresa"}</p>
                          <p>{contact.email ?? "Sem e-mail"}</p>
                        </div>

                        <div className="contacts-list__meta">
                          <span>{contact.phoneNumber ?? "Sem telefone"}</span>
                          <div className="contacts-list__actions">
                            {contact.phoneNumber ? (
                              <a
                                className="contacts-list__link"
                                href={`https://wa.me/${contact.phoneNumber}`}
                                rel="noreferrer"
                                target="_blank"
                              >
                                <Icon className="h-4 w-4" name="bolt" />
                                WhatsApp
                              </a>
                            ) : null}

                            <Button onClick={() => startEditing(contact)} size="sm" variant="secondary">
                              Editar
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </article>
                    )
                  })}
                </div>

                <footer className="contacts-pagination">
                  <p className="contacts-pagination__summary">
                    Página {page} de {totalPages}
                  </p>

                  <div className="contacts-pagination__actions">
                    <Button
                      disabled={page <= 1 || loading}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      size="sm"
                      variant="secondary"
                    >
                      Anterior
                    </Button>

                    <Button
                      disabled={page >= totalPages || loading}
                      onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                      size="sm"
                      variant="secondary"
                    >
                      Próxima
                    </Button>
                  </div>
                </footer>
              </>
            )}
          </section>

          <section className="ui-card contacts-card contacts-card--form">
            <div className="contacts-card__header contacts-card__header--stacked">
              <div>
                <p className="contacts-card__eyebrow">Novo contato</p>
              </div>
            </div>

            <form className="contacts-form" onSubmit={handleSubmit}>
              <label className="ui-field">
                <span>Nome</span>
                <input
                  className="ui-input"
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Ex.: Maria Souza"
                  value={form.name}
                />
              </label>

              <label className="ui-field">
                <span>E-mail</span>
                <input
                  className="ui-input"
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="Ex.: maria@guidance.dev"
                  value={form.email}
                />
              </label>

              <label className="ui-field">
                <span>Empresa</span>
                <input
                  className="ui-input"
                  onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))}
                  placeholder="Ex.: Guidance"
                  value={form.company}
                />
              </label>

              <label className="ui-field">
                <span>Telefone</span>
                <input
                  className="ui-input"
                  onChange={(event) => setForm((current) => ({ ...current, phoneNumber: event.target.value }))}
                  placeholder="35987654321"
                  value={form.phoneNumber}
                />
              </label>

              <p className="contacts-card__hint">
                Digite DDD e 9 dígitos.
              </p>

              <Button fullWidth isLoading={saving} loadingLabel="Salvando..." type="submit" variant="primary">
                <Icon className="h-4 w-4" name="plus" />
                <span>Salvar contato</span>
              </Button>
            </form>
          </section>
        </div>
      </div>
    </AppShell>
  )
}
