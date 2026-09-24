/*
  # Lettura pubblica solo se published

  Una scheda sospesa o in revisione non è published, ma la policy autenticata
  lasciava leggere ogni scheda pubblica che non fosse removed.
  Il proprietario continua a vedere la propria scheda (tranne removed).
  Lo staff continua a vedere tutto.
*/

DROP POLICY IF EXISTS "Biographies: owner or public access" ON public.biographies;

CREATE POLICY "Biographies: owner or public access"
  ON public.biographies
  FOR SELECT
  TO authenticated
  USING (
    (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = (SELECT auth.uid())
          AND profiles.role = ANY (ARRAY['reviewer', 'admin', 'super_admin'])
      )
    )
    OR (
      status <> 'removed'
      AND (
        (
          user_id = (SELECT auth.uid())
          AND public.get_my_account_status() = 'active'
        )
        OR (
          visibility = 'public'
          AND status = 'published'
          AND public.profile_account_is_active(user_id)
        )
      )
    )
  );
