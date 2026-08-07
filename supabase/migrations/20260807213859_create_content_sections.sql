/*
# Create content_sections table

1. New Tables
- `content_sections`
  - `id` (uuid, primary key)
  - `slug` (text, unique, not null) — stable key used by the frontend to identify each section (e.g. "intro", "about")
  - `title` (text, not null) — human-readable heading shown above the section text
  - `body` (text, not null, default '') — the editable text content
  - `updated_at` (timestamptz, default now()) — last modification timestamp, shown to visitors
  - `created_at` (timestamptz, default now())
2. Security
- Enable RLS on `content_sections`.
- SELECT is public (anon + authenticated) so all visitors can read the live text.
- INSERT / UPDATE / DELETE are restricted to authenticated users (the owner who signed in).
3. Seed data
- Insert three default sections ("intro", "about", "footer") so the page is not empty on first load.
*/

CREATE TABLE IF NOT EXISTS content_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE content_sections ENABLE ROW LEVEL SECURITY;

-- Public read: every visitor can see the live text
DROP POLICY IF EXISTS "public_read_sections" ON content_sections;
CREATE POLICY "public_read_sections"
  ON content_sections FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only authenticated (owner) can insert
DROP POLICY IF EXISTS "owner_insert_sections" ON content_sections;
CREATE POLICY "owner_insert_sections"
  ON content_sections FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only authenticated (owner) can update
DROP POLICY IF EXISTS "owner_update_sections" ON content_sections;
CREATE POLICY "owner_update_sections"
  ON content_sections FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Only authenticated (owner) can delete
DROP POLICY IF EXISTS "owner_delete_sections" ON content_sections;
CREATE POLICY "owner_delete_sections"
  ON content_sections FOR DELETE
  TO authenticated
  USING (true);

-- Seed default sections (idempotent)
INSERT INTO content_sections (slug, title, body)
VALUES
  ('intro', 'Введение', 'Здесь будет ваш основной текст. Отредактируйте его в панели управления — и все посетители мгновенно увидят изменения.')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO content_sections (slug, title, body)
VALUES
  ('about', 'О проекте', 'Это второй раздел. Вы можете создать столько разделов, сколько нужно, и менять их в любой момент.')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO content_sections (slug, title, body)
VALUES
  ('footer', 'Подвал', 'Последний блок текста — например, контакты или примечание.')
ON CONFLICT (slug) DO NOTHING;
