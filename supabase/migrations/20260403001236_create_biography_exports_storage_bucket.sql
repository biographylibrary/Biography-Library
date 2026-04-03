/*
  # Create biography-exports storage bucket

  ## Summary
  Creates a public Supabase Storage bucket for storing auto-generated
  biography export files (TXT and DOCX). Files are written by the
  review submission server route and read publicly by anyone with the URL.

  ## Storage Bucket
  - Name: `biography-exports`
  - Public: true (files are accessible via public URL without authentication)
  - File path convention: `biography-exports/{biography_id}/biography.txt`
                          `biography-exports/{biography_id}/biography.docx`

  ## Notes
  1. The bucket is public so that download links on the public view page
     work without requiring authentication.
  2. Uploads are performed server-side using the service role key, so no
     RLS INSERT policy is needed for authenticated users.
  3. Files are overwritten (upsert) on every re-submission.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('biography-exports', 'biography-exports', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Public read biography exports"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'biography-exports');
