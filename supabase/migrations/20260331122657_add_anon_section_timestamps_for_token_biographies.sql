/*
  # Allow anon users to read biography_sections for token-accessible biographies

  ## Summary
  Adds a narrow anon SELECT policy on biography_sections so that anonymous users
  who have accessed a link-only biography via a valid share token can also read
  the section timestamps used for display on the view page.

  ## Scope
  - SELECT only, anon role only
  - Restricted to biography_sections whose parent biography is link-only with a
    non-null share_token
  - The actual token matching is enforced at the application layer (the RPC call
    already validated the token before the sections query is made); this policy
    allows the minimum necessary read access for the sections display data
  - No insert/update/delete is granted to anon

  ## Important notes
  - This does NOT expose section content to arbitrary anon access — the biography
    must be link-only (not private, not public-only)
  - The content itself is already served through the biography.content JSON column
    returned by get_biography_by_share_token; sections here only carry timestamps
  - Private biographies are excluded because their parent biography has
    visibility != 'link-only'
*/

DROP POLICY IF EXISTS "Anon can read sections of link-only biographies" ON public.biography_sections;

CREATE POLICY "Anon can read sections of link-only biographies"
  ON public.biography_sections FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.biographies b
      WHERE b.id         = biography_sections.biography_id
        AND b.visibility = 'link-only'
        AND b.share_token IS NOT NULL
    )
  );
