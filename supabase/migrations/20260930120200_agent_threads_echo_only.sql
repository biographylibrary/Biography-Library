/*
  # agent_threads: solo Echo

  Restano solo i thread di Echo. Tolti i tipi biography_coach e
  publication_reviewer (nessuna interfaccia li raggiungeva) e platform_guide,
  che serviva solo come tipo di archiviazione precedente di Echo.

  Verificato in produzione il 30 settembre 2026: 9 thread, tutti 'echo'.
  Per sicurezza i thread di altri tipi (e, a cascata, messaggi e memoria)
  vengono eliminati prima di restringere il vincolo.
*/

DELETE FROM public.agent_threads WHERE agent_type <> 'echo';

ALTER TABLE public.agent_threads DROP CONSTRAINT IF EXISTS agent_threads_agent_type_check;
ALTER TABLE public.agent_threads
  ADD CONSTRAINT agent_threads_agent_type_check CHECK (agent_type = 'echo');
