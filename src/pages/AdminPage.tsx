import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, type ContentSection } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

type DraftMap = Record<string, { title: string; body: string }>
type SavingMap = Record<string, boolean>
type SavedMap = Record<string, boolean>

export default function AdminPage() {
  const { session, signOut, loading } = useAuth()
  const navigate = useNavigate()
  const [sections, setSections] = useState<ContentSection[]>([])
  const [drafts, setDrafts] = useState<DraftMap>({})
  const [saving, setSaving] = useState<SavingMap>({})
  const [saved, setSaved] = useState<SavedMap>({})
  const [loadingSections, setLoadingSections] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !session) {
      navigate('/login', { replace: true })
    }
  }, [loading, session, navigate])

  useEffect(() => {
    if (!session) return
    let mounted = true

    const load = async () => {
      const { data, error } = await supabase
        .from('content_sections')
        .select('id, slug, title, body, updated_at, created_at')
        .order('created_at', { ascending: true })

      if (!mounted) return

      if (error) {
        setError('Не удалось загрузить разделы.')
        setLoadingSections(false)
        return
      }

      const list = data ?? []
      setSections(list)
      const initialDrafts: DraftMap = {}
      for (const s of list) {
        initialDrafts[s.id] = { title: s.title, body: s.body }
      }
      setDrafts(initialDrafts)
      setLoadingSections(false)
    }

    load()

    const channel = supabase
      .channel('admin_content_sections_live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'content_sections' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const deleted = payload.old as ContentSection
            setSections((prev) => prev.filter((s) => s.id !== deleted.id))
            return
          }
          const changed = payload.new as ContentSection
          setSections((prev) => {
            const exists = prev.some((s) => s.id === changed.id)
            if (!exists) return [...prev, changed].sort((a, b) => a.created_at.localeCompare(b.created_at))
            return prev.map((s) => (s.id === changed.id ? changed : s))
          })
        }
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [session])

  const updateDraft = (id: string, field: 'title' | 'body', value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }))
    setSaved((prev) => ({ ...prev, [id]: false }))
  }

  const handleSave = async (id: string) => {
    const draft = drafts[id]
    if (!draft) return
    setSaving((prev) => ({ ...prev, [id]: true }))
    setError(null)

    const { error } = await supabase
      .from('content_sections')
      .update({
        title: draft.title,
        body: draft.body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    setSaving((prev) => ({ ...prev, [id]: false }))

    if (error) {
      setError('Не удалось сохранить раздел.')
      return
    }

    setSaved((prev) => ({ ...prev, [id]: true }))
    setTimeout(() => {
      setSaved((prev) => ({ ...prev, [id]: false }))
    }, 2500)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот раздел? Действие нельзя отменить.')) return
    const { error } = await supabase.from('content_sections').delete().eq('id', id)
    if (error) {
      setError('Не удалось удалить раздел.')
    }
  }

  const handleAdd = async () => {
    const slug = prompt('Введите ключ нового раздела (например, "news"):')
    if (!slug) return
    const trimmed = slug.trim().toLowerCase().replace(/\s+/g, '-')
    if (!trimmed) return

    const { data, error } = await supabase
      .from('content_sections')
      .insert({
        slug: trimmed,
        title: 'Новый раздел',
        body: 'Текст нового раздела…',
      })
      .select('id, slug, title, body, updated_at, created_at')
      .maybeSingle()

    if (error || !data) {
      setError('Не удалось создать раздел. Возможно, такой ключ уже существует.')
      return
    }

    setSections((prev) => [...prev, data].sort((a, b) => a.created_at.localeCompare(b.created_at)))
    setDrafts((prev) => ({ ...prev, [data.id]: { title: data.title, body: data.body } }))
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

  if (loading || (!session && !loading)) {
    return (
      <div className="page-wrap">
        <p className="muted">Загрузка…</p>
      </div>
    )
  }

  return (
    <div className="page-wrap">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-mark">TxT</span>
            <span className="brand-sub">панель управления</span>
          </div>
          <div className="topbar-actions">
            <Link to="/" className="btn btn-sm btn-outline">Просмотр сайта</Link>
            <button onClick={handleSignOut} className="btn btn-sm btn-danger-outline">Выйти</button>
          </div>
        </div>
      </header>

      <main className="content content-admin">
        <div className="admin-header">
          <h1>Редактирование разделов</h1>
          <button onClick={handleAdd} className="btn btn-primary">+ Добавить раздел</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loadingSections ? (
          <p className="muted">Загрузка разделов…</p>
        ) : (
          <div className="editor-list">
            {sections.map((section) => {
              const draft = drafts[section.id] ?? { title: section.title, body: section.body }
              const isSaving = saving[section.id]
              const justSaved = saved[section.id]
              return (
                <div key={section.id} className="editor-card">
                  <div className="editor-card-head">
                    <span className="editor-slug">{section.slug}</span>
                    <button
                      onClick={() => handleDelete(section.id)}
                      className="btn btn-sm btn-danger-outline"
                    >
                      Удалить
                    </button>
                  </div>
                  <label className="field">
                    <span>Заголовок</span>
                    <input
                      type="text"
                      value={draft.title}
                      onChange={(e) => updateDraft(section.id, 'title', e.target.value)}
                      className="input"
                    />
                  </label>
                  <label className="field">
                    <span>Текст</span>
                    <textarea
                      value={draft.body}
                      onChange={(e) => updateDraft(section.id, 'body', e.target.value)}
                      rows={6}
                      className="input textarea"
                    />
                  </label>
                  <div className="editor-actions">
                    <button
                      onClick={() => handleSave(section.id)}
                      className="btn btn-primary"
                      disabled={isSaving}
                    >
                      {isSaving ? 'Сохранение…' : 'Сохранить'}
                    </button>
                    {justSaved && <span className="saved-tag">Сохранено — обновлено у всех</span>}
                  </div>
                  <p className="section-meta">
                    Последнее обновление: {new Date(section.updated_at).toLocaleString('ru-RU')}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
