/*
  # Fix biography_sections anonymous token leak

  ## Problem
  The previous policy "Anon can read sections of link-only biographies" allowed
  anonymous users to SELECT rows from biography_sections for any link-only
  biography that had a non-null share_token — without requiring the caller to
  prove they know the token. Any anonymous request that knows the biography UUID
  could bypass the share-token access control.

  ## Fix
  Drop the leaky anon policy entirely. Anonymous users no longer have any direct
  SELECT access to biography_sections.

  Section timestamps that were used for display on the public view page will be
  provided through the existing SECURITY DEFINER function
  get_biography_by_share_token (updated separately to include section timestamps
  in its return set). This means token proof is enforced at the RPC level before
  any section data is returned.

  ## Policies removed
  - "Anon can read sections of link-only biographies" (SELECT, anon role)

  ## Policies preserved
  - "Users can read own biography sections" (SELECT, authenticated)
  - "Users can insert own biography sections" (INSERT, authenticated)
  - "Users can update own biography sections" (UPDATE, authenticated)
  - "Users can delete own biography sections" (DELETE, authenticated)

  ## Result
  Anon role has zero direct access to biography_sections. Token-based access to
  section timestamps is provided exclusively through the token-aware RPC.
*/

DROP POLICY IF EXISTS "Anon can read sections of link-only biographies" ON public.biography_sections;
