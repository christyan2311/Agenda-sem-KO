/*
  # Create eventos table

  1. New Tables
    - `eventos`
      - `id` (text, primary key) - client-generated ID
      - `nome` (text, not null) - event name
      - `data` (text) - event date in YYYY-MM-DD format
      - `hora` (text) - event time
      - `local` (text) - event location
      - `descricao` (text) - event description
      - `flyer` (text) - Cloudinary image URL
      - `created_at` (timestamptz) - creation timestamp

  2. Security
    - Enable RLS on `eventos` table
    - Allow public read and write (public agenda app without auth)
*/

CREATE TABLE IF NOT EXISTS eventos (
  id text PRIMARY KEY,
  nome text NOT NULL DEFAULT '',
  data text DEFAULT '',
  hora text DEFAULT '',
  local text DEFAULT '',
  descricao text DEFAULT '',
  flyer text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read eventos"
  ON eventos FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public can insert eventos"
  ON eventos FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Public can update eventos"
  ON eventos FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete eventos"
  ON eventos FOR DELETE
  TO anon
  USING (true);
