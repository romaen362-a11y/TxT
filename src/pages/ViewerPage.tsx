import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, type ContentSection } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function ViewerPage() {
  const [sections, setSections] = useState<ContentSection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { session } = useAuth()

  useEffect(() => {
    let mounted = true

    const loadSections = async () => {
      const { data, error } = await supabase
        .from('content_sections')
        .select('id, slug, title, body, updated_at, created_at')
        .order('created_at', { ascending: true })

      if (!mounted) return

      if (error) {
        setError('Не удалось загрузить текст. Проверьте соединение.')
        setLoading(false)
        return
      }

      setSections(data ?? [])
      setLoading(false)
    }

    loadSections()

    const channel = supabase
      .channel('content_sections_live')
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
  }, [])

  if (loading) {
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
            <span className="brand-sub">живой текст</span>
          </div>
          <div className="topbar-actions">
            {session ? (
              <Link to="/admin" className="btn btn-sm">Панель управления</Link>
            ) : (
              <Link to="/login" className="btn btn-sm btn-outline">Вход</Link>
            )}
          </div>
        </div>
      </header>

      <main className="content">
        {error && <div className="alert alert-error">{error}</div>}
        {sections.length === 0 && !error && (
          <p className="muted">Пока нет ни одного раздела.</p>
        )}
        {sections.map((section) => (
          <article key={section.id} className="section-card">
            <h2 className="section-title">{section.title}</h2>
            <p className="section-body">{section.body}</p>
            <p className="section-meta">
              Обновлено: {new Date(section.updated_at).toLocaleString('ru-RU')}
            </p>
          </article>
        ))}
      </main>
    </div>
  )
}
